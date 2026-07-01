import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export interface CalendarEvent {
  id: string;
  title: string;
  type: "PAYMENT" | "MAINTENANCE" | "LEASE";
  date: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  metadata?: any;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const searchParams = req.nextUrl.searchParams;
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "Missing start and end date parameters" }, { status: 400 });
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  try {
    const events: CalendarEvent[] = [];

    // Base conditions depending on role
    const ownerCondition = role === "OWNER" ? { property: { ownerId: userId } } : {};
    const tenantCondition = role === "TENANT" ? { tenantId: userId } : {};

    // 1. Fetch Invoices (Rent Due) - Inspectors do not see invoices
    if (role !== "INSPECTOR") {
      const invoices = await prisma.invoice.findMany({
        where: {
          dueDate: { gte: startDate, lte: endDate },
          status: { not: "PAID" },
          lease: role === "TENANT" 
            ? { tenantId: userId } 
            : (role === "OWNER" ? { unit: { property: { ownerId: userId } } } : {}),
        },
        include: {
          lease: { include: { unit: { include: { property: true } } } },
        },
      });

      invoices.forEach((inv) => {
        events.push({
          id: `inv_${inv.id}`,
          title: `Rent Due - $${Number(inv.amount).toLocaleString()} (${inv.lease.unit.property.name} Unit ${inv.lease.unit.name || ''})`,
          type: "PAYMENT",
          date: inv.dueDate.toISOString(),
          priority: "HIGH",
          metadata: {
            invoiceId: inv.id,
            amount: Number(inv.amount),
            propertyName: inv.lease.unit.property.name,
            unitNumber: inv.lease.unit.name,
          },
        });
      });
    }

    // 2. Fetch Scheduled Maintenance
    const maintenance = await prisma.maintenanceRequest.findMany({
      where: {
        scheduledDate: { gte: startDate, lte: endDate, not: null },
        status: { not: "CLOSED" },
        ...(role === "TENANT" ? { tenantId: userId } : {}),
        ...(role === "OWNER" ? { unit: { property: { ownerId: userId } } } : {}),
        ...(role === "INSPECTOR" ? { inspectorId: userId } : {}),
      },
      include: {
        unit: { include: { property: true } },
      },
    });

    maintenance.forEach((req) => {
      if (!req.scheduledDate) return;
      events.push({
        id: `maint_${req.id}`,
        title: `Inspection/Repair: ${req.title}`,
        type: "MAINTENANCE",
        date: req.scheduledDate.toISOString(),
        priority: req.priority as "HIGH" | "MEDIUM" | "LOW",
        metadata: {
          requestId: req.id,
          propertyName: req.unit.property.name,
          unitNumber: req.unit.name,
          category: req.category,
        },
      });
    });

    // 3. Fetch Lease Expirations - Inspectors do not see leases
    if (role !== "INSPECTOR") {
      const leases = await prisma.lease.findMany({
        where: {
          endDate: { gte: startDate, lte: endDate },
          status: "ACTIVE",
          ...(role === "TENANT" ? { tenantId: userId } : {}),
          ...(role === "OWNER" ? { unit: { property: { ownerId: userId } } } : {}),
        },
        include: {
          unit: { include: { property: true } },
          tenant: { select: { name: true } },
        },
      });

      leases.forEach((lease) => {
        events.push({
          id: `lease_${lease.id}`,
          title: `Lease Expires - ${lease.tenant.name}`,
          type: "LEASE",
          date: lease.endDate.toISOString(),
          priority: "HIGH",
          metadata: {
            leaseId: lease.id,
            propertyName: lease.unit.property.name,
            unitNumber: lease.unit.name,
            tenantName: lease.tenant.name,
          },
        });
      });
    }

    // Sort events by date ascending
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("Failed to fetch calendar events:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch events" }, { status: 500 });
  }
}
