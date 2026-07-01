import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const searchParams = req.nextUrl.searchParams;
  const isEmergency = searchParams.get("emergency") === "true";
  const id = searchParams.get("id");

  try {
    if (id) {
      const request = await prisma.maintenanceRequest.findUnique({
        where: { id },
        include: {
          unit: { include: { property: true } },
          tenant: { select: { name: true, email: true, phone: true } },
          inspector: { select: { name: true, email: true, phone: true } }
        }
      });
      if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(request);
    }

    let whereClause: any = {};

    if (role === "OWNER") {
      whereClause.unit = { property: { ownerId: userId } };
    } else if (role === "TENANT") {
      whereClause.tenantId = userId;
    } else if (role === "INSPECTOR") {
      whereClause.inspectorId = userId;
    }

    if (isEmergency) {
      whereClause.priority = { in: ["EMERGENCY", "HIGH"] };
    }

    const requests = await prisma.maintenanceRequest.findMany({
      where: whereClause,
      include: {
        unit: {
          include: { property: true }
        },
        tenant: {
          select: { name: true, email: true, phone: true }
        },
        inspector: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(requests);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch maintenance requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    
    if (!data.unitId || !data.title || !data.description) {
      return NextResponse.json({ error: "Missing required fields: unitId, title, description" }, { status: 400 });
    }

    // Use tenantId from body if provided (landlord/admin submitting on behalf of tenant),
    // otherwise use the session user's own ID (tenant submitting their own request)
    const tenantId = (data.tenantId && data.tenantId !== "") 
      ? data.tenantId 
      : (session.user as any).id;

    if (!tenantId) {
      return NextResponse.json({ error: "Could not determine tenant ID" }, { status: 400 });
    }

    const request = await prisma.maintenanceRequest.create({
      data: {
        unitId: data.unitId,
        tenantId,
        title: data.title,
        description: data.description,
        category: data.category || "GENERAL",
        priority: data.priority || "MEDIUM",
        status: data.inspectorId ? "ASSIGNED" : "SUBMITTED",
        photos: Array.isArray(data.photos) ? data.photos : [],
        ...(data.inspectorId ? { inspectorId: data.inspectorId } : {}),
        ...(data.estimatedCost ? { estimatedCost: parseFloat(data.estimatedCost) } : {}),
        ...(data.scheduledDate ? { scheduledDate: new Date(data.scheduledDate) } : {}),
      } as any
    });

    // Auto-notify: find the owner of the unit's property and notify them
    try {
      const unit = await prisma.unit.findUnique({
        where: { id: data.unitId },
        include: { property: true },
      });
      if (unit?.property?.ownerId) {
        const priorityMap: Record<string, "HIGH" | "MEDIUM" | "LOW"> = {
          EMERGENCY: "HIGH", HIGH: "HIGH", MEDIUM: "MEDIUM", LOW: "LOW",
        };
        const notifPriority = priorityMap[data.priority?.toUpperCase()] ?? "MEDIUM";
        await notify({
          userId: unit.property.ownerId,
          title: `New Maintenance Request – ${data.title}`,
          message: `A new ${data.priority || "MEDIUM"} priority maintenance request has been submitted for ${unit?.property?.name || 'Property'} - ${unit?.name?.includes('Unit') ? unit.name : `Unit ${unit?.name || 'Unknown'}`}: "${data.description?.slice(0, 100)}..."`,
          type: "MAINTENANCE",
          priority: notifPriority,
          relatedEntityId: request.id,
        });
      }
    } catch (_) {/* non-fatal */}

    return NextResponse.json(request, { status: 201 });
  } catch (error: any) {
    console.error("Maintenance create error:", error.message);
    return NextResponse.json({ error: error.message || "Failed to create request" }, { status: 500 });
  }
}


export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json({ error: "Missing request ID" }, { status: 400 });
    }

    // Process dates or numbers if present
    if (updateData.estimatedCost) {
      updateData.estimatedCost = parseFloat(updateData.estimatedCost);
    }
    if (updateData.scheduledDate) {
      updateData.scheduledDate = new Date(updateData.scheduledDate);
    }
    if (updateData.diagnosisDate) {
      updateData.diagnosisDate = new Date(updateData.diagnosisDate);
    }
    if (updateData.repairDate) {
      updateData.repairDate = new Date(updateData.repairDate);
    }

    // Auto-update status based on inspector assignment if not explicitly set
    if (updateData.inspectorId && !updateData.status) {
      updateData.status = "ASSIGNED";
    }

    const updatedRequest = await prisma.maintenanceRequest.update({
      where: { id },
      data: updateData as any,
    });

    // Auto-notify on status change → tell the tenant
    if (updateData.status) {
      try {
        const fullRequest = await prisma.maintenanceRequest.findUnique({
          where: { id },
          include: { unit: { include: { property: true } }, inspector: true },
        });
        if (fullRequest?.tenantId) {
          const statusMessages: Record<string, string> = {
            ASSIGNED: `Your maintenance request "${fullRequest.title}" has been assigned to an inspector and is being scheduled.`,
            DIAGNOSIS_SCHEDULED: `Inspector ${fullRequest.inspector?.name || "assigned"} is scheduled to come for a diagnosis visit for "${fullRequest.title}" on ${updateData.diagnosisDate ? new Date(updateData.diagnosisDate).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' }) : 'soon'}.`,
            SUBMIT_ESTIMATE: `An estimate has been submitted for "${fullRequest.title}".`,
            APPROVED: `The repair estimate for "${fullRequest.title}" has been approved. Repairs will be scheduled shortly.`,
            REPAIR_SCHEDULED: `Inspector ${fullRequest.inspector?.name || "assigned"} is scheduled to come for a repair visit for "${fullRequest.title}" on ${updateData.repairDate ? new Date(updateData.repairDate).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' }) : 'soon'}.`,
            IN_PROGRESS: `Work has started on your maintenance request "${fullRequest.title}".`,
            RESOLVED: `Your maintenance request "${fullRequest.title}" has been resolved. Please check and confirm everything is in order.`,
            CLOSED: `Your maintenance request "${fullRequest.title}" has been closed.`,
          };
          const msg = statusMessages[updateData.status] ||
            `Your maintenance request status has been updated to ${updateData.status.replace("_", " ")}.`;
          await notify({
            userId: fullRequest.tenantId,
            title: `Maintenance Update – ${fullRequest.title}`,
            message: msg,
            type: "MAINTENANCE",
            priority: updateData.status === "RESOLVED" ? "LOW" : "MEDIUM",
            relatedEntityId: id,
          });
        }
        // Also notify inspector when assigned
        if (updateData.inspectorId && fullRequest) {
          await notify({
            userId: updateData.inspectorId,
            title: "New Maintenance Assignment",
            message: `You have been assigned to a maintenance request: "${fullRequest.title}" at ${fullRequest.unit?.property?.name || "a property"}.`,
            type: "MAINTENANCE",
            priority: "MEDIUM",
            relatedEntityId: id,
          });
        }
      } catch (_) {/* non-fatal */}
    }

    return NextResponse.json(updatedRequest);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update request" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing request ID" }, { status: 400 });
  }

  try {
    await prisma.maintenanceRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete request" }, { status: 500 });
  }
}

