import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit-log";
import { decryptSymmetric as decrypt } from "@/lib/encryption";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        createdAt: true,
        tenantStatus: true,
        accountStatus: true,
        dob: true,
        ssn: true,
        employer: true,
        position: true,
        annualIncome: true,
        employmentStartDate: true,
        emergencyName: true,
        emergencyRelationship: true,
        emergencyPhone: true,
        emergencyEmail: true,
        creditScore: true,
        targetMoveInDate: true,
        notes: true,
        bankName: true,
        accountNumber: true,
        accountName: true,
        balance: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
        currentTierId: true,
        pricingTier: {
          select: {
            id: true,
            name: true,
          }
        },
        ownedProperties: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            coverPhoto: true,
            images: true,
            units: {
              select: {
                id: true,
                name: true,
                leases: {
                  where: {
                    status: {
                      in: ["ACTIVE", "NOTICE_GIVEN"]
                    }
                  },
                  select: {
                    id: true,
                    startDate: true,
                    endDate: true,
                    monthlyRent: true,
                    tenant: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
                      }
                    }
                  }
                }
              }
            }
          },
        },
        leases: {
          include: {
            unit: {
              include: {
                property: {
                  select: {
                    id: true,
                    name: true,
                    coverPhoto: true,
                    images: true,
                    owner: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
                      }
                    }
                  }
                },
              },
            },
          },
        },
        createdInspectors: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
            accountStatus: true
          }
        },
        ownedVendors: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            specialty: true,
            createdAt: true
          }
        },
        payoutRequests: {
          select: {
            id: true,
            amount: true,
            status: true,
            bankName: true,
            accountNumber: true,
            accountName: true,
            createdAt: true,
            disbursedAt: true,
            refNumber: true
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        subscriptionHistory: {
          select: {
            id: true,
            fromTierId: true,
            toTierId: true,
            fromTierName: true,
            toTierName: true,
            event: true,
            amountPaid: true,
            createdAt: true
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        maintenanceRequest: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            priority: true,
            status: true,
            createdAt: true,
            unit: {
              select: {
                id: true,
                name: true,
                property: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        transactions: {
          select: {
            id: true,
            type: true,
            category: true,
            amount: true,
            status: true,
            createdAt: true,
            reference: true
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        assignedInspections: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            priority: true,
            status: true,
            createdAt: true,
            scheduledDate: true,
            unit: {
              select: {
                id: true,
                name: true,
                property: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            },
            tenant: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const decryptedUser: any = { ...user };
    if (decryptedUser.ssn) decryptedUser.ssn = decrypt(decryptedUser.ssn);
    if (decryptedUser.accountNumber) decryptedUser.accountNumber = decrypt(decryptedUser.accountNumber);

    // Fetch tenant's latest submitted rental application if available
    const application = await prisma.application.findFirst({
      where: { email: user.email },
      include: {
        unit: {
          include: {
            property: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    decryptedUser.application = application || null;

    return NextResponse.json(decryptedUser);
  } catch (error: any) {
    console.error("Fetch user details error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch user details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { 
      name, email, phone, role, tenantStatus, accountStatus, notes,
      avatar, dob, ssn, employer, position, annualIncome,
      emergencyName, emergencyRelationship, emergencyPhone, emergencyEmail,
      creditScore, bankName, accountNumber, accountName
    } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (tenantStatus !== undefined) updateData.tenantStatus = tenantStatus;
    if (accountStatus !== undefined) updateData.accountStatus = accountStatus;
    if (notes !== undefined) updateData.notes = notes;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (dob !== undefined) updateData.dob = dob;
    if (employer !== undefined) updateData.employer = employer;
    if (position !== undefined) updateData.position = position;
    if (annualIncome !== undefined && annualIncome !== "") updateData.annualIncome = Number(annualIncome);
    if (emergencyName !== undefined) updateData.emergencyName = emergencyName;
    if (emergencyRelationship !== undefined) updateData.emergencyRelationship = emergencyRelationship;
    if (emergencyPhone !== undefined) updateData.emergencyPhone = emergencyPhone;
    if (emergencyEmail !== undefined) updateData.emergencyEmail = emergencyEmail;
    if (creditScore !== undefined && creditScore !== "") updateData.creditScore = Number(creditScore);
    if (bankName !== undefined) updateData.bankName = bankName;
    if (accountName !== undefined) updateData.accountName = accountName;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    await auditLog({
      entityType: "USER",
      entityId: id,
      action: "UPDATED",
      actorId: (session.user as any).id,
      actorRole: "SUPERADMIN",
      newValue: { name, email, phone, role, tenantStatus, accountStatus, notes },
      note: `Admin updated user details.`,
    });

    const { password: _, ...sanitizedUser } = updatedUser;
    return NextResponse.json(sanitizedUser);
  } catch (error: any) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    // Prevent deleting own account
    if (id === (session.user as any).id) {
      return NextResponse.json(
        { error: "You cannot delete your own admin account." },
        { status: 400 }
      );
    }

    try {
      await auditLog({
        entityType: "USER",
        entityId: id,
        action: "DELETED",
        actorId: (session.user as any).id,
        actorRole: "SUPERADMIN",
        note: `Admin deleted user account.`,
      });

      await prisma.user.delete({
        where: { id },
      });
      return NextResponse.json({ success: true });
    } catch (dbError: any) {
      // Prisma error code P2003 indicates foreign key constraint failure
      if (dbError.code === "P2003") {
        return NextResponse.json(
          {
            error:
              "This user cannot be deleted because they are associated with existing properties, active leases, or maintenance requests. You can deactivate them instead.",
          },
          { status: 400 }
        );
      }
      throw dbError;
    }
  } catch (error: any) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
