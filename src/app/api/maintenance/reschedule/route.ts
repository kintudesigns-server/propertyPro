import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const { requestId, reason, proposedDate } = data;

    if (!requestId || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: { tenant: true, unit: { include: { property: true } } }
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Determine the current phase to reset
    // If it was DIAGNOSIS_SCHEDULED, reset to ASSIGNED (needs diagnosis reschedule)
    // If it was REPAIR_SCHEDULED, reset to APPROVED (needs repair reschedule)
    let newStatus = request.status;
    let clearDiagnosis = false;
    let clearRepair = false;

    if (request.status === "DIAGNOSIS_SCHEDULED") {
      newStatus = "ASSIGNED";
      clearDiagnosis = true;
    } else if (request.status === "REPAIR_SCHEDULED") {
      newStatus = "APPROVED";
      clearRepair = true;
    }

    // Append to preferred times
    const formattedDate = proposedDate ? new Date(proposedDate).toLocaleString() : "Not provided";
    const rescheduleNote = `[Reschedule Request] Reason: ${reason} | Proposed Time: ${formattedDate}`;
    const updatedPreferredTimes = request.preferredTimes 
      ? `${request.preferredTimes}\n\n${rescheduleNote}`
      : rescheduleNote;

    const updatedRequest = await prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        preferredTimes: updatedPreferredTimes,
        scheduledDate: null,
        ...(clearDiagnosis ? { diagnosisDate: null } : {}),
        ...(clearRepair ? { repairDate: null } : {}),
      },
    });

    // Notify the inspector
    if (request.inspectorId) {
      try {
        await notify({
          userId: request.inspectorId,
          title: `Reschedule Requested - ${request.title}`,
          message: `The tenant has requested to reschedule. Reason: "${reason}". Proposed Time: ${formattedDate}. Please review the ticket and schedule a new time.`,
          type: "MAINTENANCE",
          priority: "HIGH",
          relatedEntityId: requestId,
        });
      } catch (err) {
        console.error("Failed to notify inspector", err);
      }
    }

    return NextResponse.json(updatedRequest);
  } catch (error: any) {
    console.error("Reschedule error:", error.message);
    return NextResponse.json({ error: "Failed to process reschedule" }, { status: 500 });
  }
}
