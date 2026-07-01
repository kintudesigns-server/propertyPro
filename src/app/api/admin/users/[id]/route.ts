import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

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
        ownedProperties: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
        leases: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
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
    const { name, email, phone, role, tenantStatus } = body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        role,
        tenantStatus,
      },
    });

    return NextResponse.json(updatedUser);
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
