import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit-log";
import { decryptSymmetric } from "@/lib/encryption";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const { id: leaseId } = await params;

  // Find the lease
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    include: {
      unit: {
        include: { property: true }
      }
    }
  });

  if (!lease) {
    return NextResponse.json({ error: "Lease not found" }, { status: 404 });
  }

  // Only SUPERADMIN or the OWNER of the property can decrypt the tenant's refund account
  if (user.role !== "SUPERADMIN" && lease.unit.property.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden: Insufficient privileges to view sensitive bank data." }, { status: 403 });
  }

  if (!lease.refundAccountNumber) {
    return NextResponse.json({ error: "No encrypted refund bank details found for this lease." }, { status: 400 });
  }

  // Mandatory Audit Trail
  await auditLog({
    entityType: "LEASE",
    entityId: lease.id,
    action: "VIEW_SENSITIVE_DATA",
    actorId: user.id,
    actorRole: user.role,
    note: `Revealed refund bank account number for Lease ID: ${lease.id} (Property: ${lease.unit.property.name})`,
  });

  try {
    const plaintextNumber = decryptSymmetric(lease.refundAccountNumber);
    
    // For extreme security, we don't save this decryption event to the browser cache.
    const res = NextResponse.json({ accountNumber: plaintextNumber });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (error) {
    console.error("Failed to decrypt lease refund account:", error);
    return NextResponse.json({ error: "Decryption failed. Data may be corrupt or legacy." }, { status: 500 });
  }
}
