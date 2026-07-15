import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { decryptSymmetric } from "@/lib/encryption";
import { auditLog } from "@/lib/audit-log";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  // High friction: ONLY Superadmins can unmask account numbers.
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Access denied. Admins only." }, { status: 403 });
  }

  const { id } = await params;
  const adminId = (session.user as any).id;

  try {
    const payout = await prisma.payoutRequest.findUnique({
      where: { id },
      include: { owner: true }
    });

    if (!payout) {
      return NextResponse.json({ error: "Payout request not found" }, { status: 404 });
    }

    if (!payout.accountNumber) {
      return NextResponse.json({ error: "No account number on file." }, { status: 400 });
    }

    // Decrypt the AES-256 encrypted account number
    const decryptedNumber = decryptSymmetric(payout.accountNumber);

    if (decryptedNumber === "DECRYPTION_ERROR") {
      return NextResponse.json({ error: "Failed to decrypt account number. Data may be corrupt or legacy." }, { status: 500 });
    }

    // MANDATORY AUDIT LOG
    // If a superadmin unmasks a number, we permanently record it to ensure zero internal fraud.
    await auditLog({
      entityType: "PAYOUT",
      entityId: payout.id,
      action: "UNMASK_SENSITIVE_DATA",
      actorId: adminId,
      actorRole: "SUPERADMIN",
      note: `Admin revealed the bank account number for manual wire transfer. Owner: ${payout.owner?.name || "Unknown"}`,
    });

    return NextResponse.json({
      accountNumber: decryptedNumber,
    });
  } catch (error: any) {
    console.error("Unmasking error:", error);
    return NextResponse.json({ error: "Failed to unmask account number." }, { status: 500 });
  }
}
