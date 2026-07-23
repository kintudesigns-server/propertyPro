import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { notifyMany } from "@/lib/notify";
import { getEffectiveSubscriptionRules } from "@/lib/subscription-rules";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get("id");

  try {
    if (id) {
      const property = await prisma.property.findUnique({
        where: { id },
        include: { units: true, owner: { select: { name: true, email: true } } },
      });
      if (!property) {
        return NextResponse.json({ error: "Property not found" }, { status: 404 });
      }

      // Authorization Check
      if (role !== "SUPERADMIN") {
        if (role === "OWNER" && property.ownerId !== userId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (role === "TENANT") {
          // Verify tenant has an active lease on one of the units in this property
          const hasActiveLease = await prisma.lease.findFirst({
            where: {
              tenantId: userId,
              status: "ACTIVE",
              unit: { propertyId: id }
            }
          });
          if (!hasActiveLease) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          }
        }
      }

      return NextResponse.json(property);
    }

    let properties: any[] = [];
    if (role === "SUPERADMIN") {
      properties = await prisma.property.findMany({
        include: { owner: { select: { name: true, email: true } }, units: true },
      });
    } else if (role === "OWNER") {
      properties = await prisma.property.findMany({
        where: { ownerId: userId },
        include: { units: true },
      });
    } else if (role === "TENANT") {
      // Find properties where tenant has an active lease
      properties = await prisma.property.findMany({
        where: {
          units: {
            some: {
              leases: {
                some: {
                  tenantId: userId,
                  status: "ACTIVE",
                },
              },
            },
          },
        },
      });
    } else {
      properties = [];
    }

    return NextResponse.json(properties);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch properties" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Only property owners can add properties" }, { status: 403 });
  }

  const userId = (session.user as any).id;

  try {
    const owner = await prisma.user.findUnique({
      where: { id: userId },
      include: { pricingTier: true, ownedProperties: { include: { units: true } } },
    });

    const rules = await getEffectiveSubscriptionRules(userId);
    const subStatus = (owner?.subscriptionStatus || "").toLowerCase();
    const isSubActive = subStatus === "active" || subStatus === "trialing" || subStatus.includes("canceling") || rules.isCompedAccess;

    if (rules.isPaused && rules.blockNewUnits && !rules.isCompedAccess) {
      return NextResponse.json({
        error: "Your account is paused. Your existing units are safe, but new additions are blocked.",
        code: "ACCOUNT_PAUSED",
        isPaused: true,
      }, { status: 403 });
    }

    if (!isSubActive) {
      return NextResponse.json({ error: "Active subscription required to add properties.", code: "NO_SUBSCRIPTION" }, { status: 403 });
    }
    const data = await req.json();

    if (!data.name || !data.address || !data.city || !data.country) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const unitsPayload = data.units && Array.isArray(data.units) ? data.units.map((u: any) => ({
      name: u.name || "Unnamed Unit",
      type: u.type,
      floor: u.floor ? Number(u.floor) : null,
      bathrooms: u.bathrooms ? Number(u.bathrooms) : null,
      maxOccupants: u.maxOccupants ? Number(u.maxOccupants) : 1,
      rentAmount: Number(u.rentAmount || 0),
      depositAmt: Number(u.depositAmt || 0),
      rooms: Number(u.rooms || 0),
      sqFootage: Number(u.sqFootage || 0),
      amenities: u.amenities || [],
      images: u.images || [],
      status: u.status || "VACANT"
    })) : [];

    // Tier Enforcement Check (Hard Cap)
    if (owner?.pricingTier?.maxUnits) {
      const currentUnitCount = await prisma.unit.count({
        where: { property: { ownerId: userId } }
      });
      const requestedNewUnits = unitsPayload.length > 0 ? unitsPayload.length : 1; // Even empty properties imply at least 1 logical asset if it's a house

      if (currentUnitCount + requestedNewUnits > owner.pricingTier.maxUnits) {
        return NextResponse.json({ 
          error: "LIMIT_REACHED", 
          message: `Plan limit reached. You can only have up to ${owner.pricingTier.maxUnits} units on your current plan.` 
        }, { status: 403 });
      }
    }

    const property = await prisma.property.create({
      data: {
        name: data.name,
        type: data.type || "Apartment",
        status: data.status || "AVAILABLE",
        yearBuilt: data.yearBuilt ? Number(data.yearBuilt) : null,
        description: data.description,
        address: data.address,
        city: data.city,
        state: data.state || "",
        zip: data.zip || "",
        country: data.country,
        coverPhoto: data.coverPhoto || null,
        images: data.images || [],
        amenities: data.amenities || [],
        ownerId: (session.user as any).id,
        units: {
          create: unitsPayload
        }
      },
      include: { units: true }
    });

    // Create a notification for the owner
    await prisma.notification.create({
      data: {
        userId: userId,
        title: "Property Created",
        message: `Your property "${property.name}" has been successfully added to your portfolio and is pending approval.`,
        type: "SYSTEM",
        priority: "LOW",
        relatedEntityId: property.id,
      }
    });

    // Notify all admins of the new property and send email alert
    try {
      const admins = await prisma.user.findMany({
        where: { role: "SUPERADMIN" },
        select: { id: true, email: true }
      });
      const adminIds = admins.map(a => a.id);
      await notifyMany(adminIds, {
        title: "New Property Created",
        message: `Owner "${owner?.name || 'Owner'}" has added a new property "${property.name}" that is pending approval.`,
        type: "SYSTEM",
        priority: "MEDIUM",
        relatedEntityId: property.id,
      });

      const adminUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/admin/approve-properties`;
      for (const admin of admins) {
        if (admin.email) {
          await sendEmail({
            to: admin.email,
            subject: "🔔 Alert: New Property Registered",
            html: `
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                      <td align="center" style="background-color: #0f172a; padding: 40px 20px;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">New Property Registered</h1>
                        <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 15px;">Pending Admin Approval</p>
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding: 40px 32px;">
                        <p style="margin: 0 0 16px; font-size: 16px; color: #0f172a; font-weight: 600;">Hi Admin,</p>
                        <p style="margin: 0 0 24px; color: #475569; line-height: 1.6; font-size: 15px;">
                          An owner has registered a new property that requires review and approval before going live.
                        </p>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                          <tr>
                            <td style="padding: 20px;">
                              <h3 style="margin: 0 0 16px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Property Details</h3>
                              <table width="100%" cellpadding="0" cellspacing="0">
                                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 120px;">Property Name</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${property.name}</td></tr>
                                <tr><td colspan="2" style="border-bottom: 1px solid #e2e8f0;"></td></tr>
                                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Registered By</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${owner?.name || 'Owner'}</td></tr>
                                <tr><td colspan="2" style="border-bottom: 1px solid #e2e8f0;"></td></tr>
                                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Address</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${property.address}, ${property.city}, ${property.state || ''} ${property.zip || ''}</td></tr>
                                <tr><td colspan="2" style="border-bottom: 1px solid #e2e8f0;"></td></tr>
                                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Property Type</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${property.type}</td></tr>
                                <tr><td colspan="2" style="border-bottom: 1px solid #e2e8f0;"></td></tr>
                                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Units Count</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${unitsPayload.length}</td></tr>
                              </table>
                            </td>
                          </tr>
                        </table>
 
                        <!-- CTA -->
                        <div style="text-align: center;">
                          <a href="${adminUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">Approve Properties →</a>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            `
          });
        }
      }
    } catch (err) {
      console.error("[properties] Failed to notify admins of new property:", err);
    }

    // Send confirmation email to the owner
    if (owner?.email) {
      await sendEmail({
        to: owner.email,
        subject: "Property Registered Successfully - Pending Approval",
        html: `
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 40px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  <tr>
                    <td align="center" style="background-color: #2563eb; padding: 40px 20px;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Property Registered</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 32px;">
                      <p style="margin: 0 0 16px; font-size: 16px; color: #0f172a; font-weight: 600;">Hi ${owner.name || 'Owner'},</p>
                      <p style="margin: 0 0 24px; color: #475569; line-height: 1.6; font-size: 15px;">
                        Your property <strong>${property.name}</strong> has been successfully registered on PropertyPro. It is currently pending admin approval. We will notify you once it has been reviewed.
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                        <tr>
                          <td style="padding: 20px;">
                            <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;"><strong>Address:</strong> ${property.address}, ${property.city}, ${property.country}</p>
                            <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;"><strong>Type:</strong> ${property.type}</p>
                            <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Units:</strong> ${unitsPayload.length}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="background-color: #f8fafc; padding: 20px; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} PropertyPro Inc. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `
      });
    }

    return NextResponse.json(property, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create property" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Only property owners can edit properties" }, { status: 403 });
  }

  try {
    const data = await req.json();

    if (!data.id || !data.name || !data.address || !data.city || !data.country) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify ownership
    const existingProperty = await prisma.property.findUnique({
      where: { id: data.id },
    });

    if (!existingProperty) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (existingProperty.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized: You do not own this property" }, { status: 403 });
    }

    const unitsPayload = data.units && Array.isArray(data.units) ? data.units : [];
    
    // We update the property and manage units
    // Delete units that are not in the new list (assuming they have an ID if they exist)
    const incomingUnitIds = unitsPayload.filter((u: any) => u.id).map((u: any) => u.id);

    const updatedProperty = await prisma.property.update({
      where: { id: data.id },
      data: {
        name: data.name,
        type: data.type || "Apartment",
        status: data.status || "AVAILABLE",
        yearBuilt: data.yearBuilt ? Number(data.yearBuilt) : null,
        description: data.description,
        address: data.address,
        city: data.city,
        state: data.state || "",
        zip: data.zip || "",
        country: data.country,
        coverPhoto: data.coverPhoto || null,
        images: data.images || [],
        amenities: data.amenities || [],
        units: {
          deleteMany: { id: { notIn: incomingUnitIds } },
          upsert: unitsPayload.map((u: any) => ({
            where: { id: u.id || "NEW_TEMP_ID_" + Math.random() },
            update: {
              name: u.name || "Unnamed Unit",
              type: u.type,
              floor: u.floor ? Number(u.floor) : null,
              bathrooms: u.bathrooms ? Number(u.bathrooms) : null,
              maxOccupants: u.maxOccupants ? Number(u.maxOccupants) : 1,
              rentAmount: Number(u.rentAmount || 0),
              depositAmt: Number(u.depositAmt || 0),
              rooms: Number(u.rooms || 0),
              sqFootage: Number(u.sqFootage || 0),
              amenities: u.amenities || [],
              images: u.images || [],
              status: u.status || "VACANT"
            },
            create: {
              name: u.name || "Unnamed Unit",
              type: u.type,
              floor: u.floor ? Number(u.floor) : null,
              bathrooms: u.bathrooms ? Number(u.bathrooms) : null,
              maxOccupants: u.maxOccupants ? Number(u.maxOccupants) : 1,
              rentAmount: Number(u.rentAmount || 0),
              depositAmt: Number(u.depositAmt || 0),
              rooms: Number(u.rooms || 0),
              sqFootage: Number(u.sqFootage || 0),
              amenities: u.amenities || [],
              images: u.images || [],
              status: u.status || "VACANT"
            }
          }))
        }
      },
      include: { units: true }
    });

    return NextResponse.json(updatedProperty, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update property" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Only property owners can edit properties" }, { status: 403 });
  }

  try {
    const data = await req.json();

    if (!data.id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingProperty = await prisma.property.findUnique({
      where: { id: data.id },
      include: { units: true }
    });

    if (!existingProperty) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (existingProperty.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized: You do not own this property" }, { status: 403 });
    }

    // Handle Smart Media Upload
    if (data.action === "ADD_MEDIA") {
      const { targetType, targetId, url } = data;
      
      if (targetType === "PROPERTY") {
        await prisma.property.update({
          where: { id: data.id },
          data: { images: [...existingProperty.images, url] }
        });
      } else if (targetType === "UNIT") {
        const targetUnit = existingProperty.units.find(u => u.id === targetId);
        if (!targetUnit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
        
        await prisma.unit.update({
          where: { id: targetId },
          data: { images: [...targetUnit.images, url] }
        });
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Handle Smart Media Deletion
    if (data.action === "REMOVE_MEDIA") {
      const { targetType, targetId, url } = data;
      
      if (targetType === "PROPERTY") {
        await prisma.property.update({
          where: { id: data.id },
          data: { images: existingProperty.images.filter((img: string) => img !== url) }
        });
      } else if (targetType === "UNIT") {
        const targetUnit = existingProperty.units.find(u => u.id === targetId);
        if (!targetUnit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });
        
        await prisma.unit.update({
          where: { id: targetId },
          data: { images: targetUnit.images.filter((img: string) => img !== url) }
        });
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Default Status Update
    if (data.status) {
      const updatedProperty = await prisma.property.update({
        where: { id: data.id },
        data: { status: data.status },
      });
      return NextResponse.json(updatedProperty, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process property update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "OWNER") {
    return NextResponse.json({ error: "Only property owners can delete properties" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing property ID" }, { status: 400 });
    }

    const existingProperty = await prisma.property.findUnique({
      where: { id },
    });

    if (!existingProperty) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (existingProperty.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized: You do not own this property" }, { status: 403 });
    }

    await prisma.property.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Property deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete property" }, { status: 500 });
  }
}
