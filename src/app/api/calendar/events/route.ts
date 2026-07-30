import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { checkModuleAccess, moduleLockedResponse } from "@/lib/module-guard";

export interface CalendarEvent {
  id: string;
  title: string;
  type: "PAYMENT" | "MAINTENANCE" | "INSPECTION" | "LEASE" | "TOUR";
  date: string;
  priority?: "EMERGENCY" | "HIGH" | "MEDIUM" | "LOW";
  metadata?: any;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  if (role === "OWNER") {
    const access = await checkModuleAccess(userId, "calendar");
    if (!access.allowed) {
      return moduleLockedResponse(access);
    }
  }

  const searchParams = req.nextUrl.searchParams;
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  // Fallback to month view if start/end parameters omitted
  const startDate = start ? new Date(start) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endDate = end ? new Date(end) : new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0);

  try {
    const events: CalendarEvent[] = [];

    // ── 1. RENT INVOICES (PAYMENTS) — Visible to Owners & Tenants ──
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
          lease: {
            include: {
              tenant: { select: { id: true, name: true, email: true } },
              unit: { include: { property: true } },
            },
          },
        },
      });

      invoices.forEach((inv) => {
        events.push({
          id: `inv_${inv.id}`,
          title: role === "TENANT"
            ? `Rent Due: $${Number(inv.amount).toLocaleString()}`
            : `Rent Due — ${inv.lease.tenant?.name || "Tenant"} ($${Number(inv.amount).toLocaleString()})`,
          type: "PAYMENT",
          date: inv.dueDate.toISOString(),
          priority: "HIGH",
          metadata: {
            invoiceId: inv.id,
            amount: Number(inv.amount),
            propertyName: inv.lease.unit.property.name,
            unitNumber: inv.lease.unit.name,
            tenantName: inv.lease.tenant?.name,
            status: inv.status,
          },
        });
      });
    }

    // ── 2. SCHEDULED MAINTENANCE & REPAIRS ──
    const maintenanceWhere: any = {
      status: { not: "CLOSED" },
      OR: [
        { scheduledDate: { gte: startDate, lte: endDate, not: null } },
        { diagnosisDate: { gte: startDate, lte: endDate, not: null } },
        { repairDate: { gte: startDate, lte: endDate, not: null } },
      ],
    };

    if (role === "TENANT") {
      maintenanceWhere.tenantId = userId;
    } else if (role === "OWNER") {
      maintenanceWhere.unit = { property: { ownerId: userId } };
    } else if (role === "INSPECTOR") {
      maintenanceWhere.inspectorId = userId;
    }

    const maintenanceRequests = await prisma.maintenanceRequest.findMany({
      where: maintenanceWhere,
      include: {
        unit: { include: { property: true } },
        tenant: { select: { id: true, name: true } },
      },
    });

    maintenanceRequests.forEach((req) => {
      const targetDate = req.repairDate || req.diagnosisDate || req.scheduledDate;
      if (!targetDate) return;

      events.push({
        id: `maint_${req.id}`,
        title: `Repair: ${req.title}`,
        type: "MAINTENANCE",
        date: targetDate.toISOString(),
        priority: (req.priority as any) || "MEDIUM",
        metadata: {
          requestId: req.id,
          propertyName: req.unit.property.name,
          unitNumber: req.unit.name,
          category: req.category,
          tenantName: req.tenant?.name,
          status: req.status,
        },
      });
    });

    // ── 3. MOVE-IN & MOVE-OUT WALKTHROUGH INSPECTIONS ──
    const leasesWhere: any = {
      OR: [
        { preliminaryInspectionDate: { gte: startDate, lte: endDate, not: null } },
        { inspectionDate: { gte: startDate, lte: endDate, not: null } },
      ],
    };

    if (role === "TENANT") {
      leasesWhere.tenantId = userId;
    } else if (role === "OWNER") {
      leasesWhere.unit = { property: { ownerId: userId } };
    } else if (role === "INSPECTOR") {
      leasesWhere.OR = [
        { preliminaryInspectorId: userId },
        { moveOutInspectorId: userId },
      ];
    }

    const inspectionLeases = await prisma.lease.findMany({
      where: leasesWhere,
      include: {
        unit: { include: { property: true } },
        tenant: { select: { id: true, name: true } },
      },
    });

    inspectionLeases.forEach((lease) => {
      // Preliminary (Move-In) Walkthrough
      if (
        lease.preliminaryInspectionDate &&
        (role !== "INSPECTOR" || lease.preliminaryInspectorId === userId)
      ) {
        events.push({
          id: `insp_pre_${lease.id}`,
          title: `Move-In Inspection: ${lease.unit.property.name} Unit ${lease.unit.name}`,
          type: "INSPECTION",
          date: lease.preliminaryInspectionDate.toISOString(),
          priority: "HIGH",
          metadata: {
            leaseId: lease.id,
            walkthroughType: "PRELIMINARY",
            propertyName: lease.unit.property.name,
            unitNumber: lease.unit.name,
            tenantName: lease.tenant?.name,
          },
        });
      }

      // Final (Move-Out) Walkthrough
      if (
        lease.inspectionDate &&
        (role !== "INSPECTOR" || lease.moveOutInspectorId === userId)
      ) {
        events.push({
          id: `insp_final_${lease.id}`,
          title: `Move-Out Inspection: ${lease.unit.property.name} Unit ${lease.unit.name}`,
          type: "INSPECTION",
          date: lease.inspectionDate.toISOString(),
          priority: "HIGH",
          metadata: {
            leaseId: lease.id,
            walkthroughType: "FINAL",
            propertyName: lease.unit.property.name,
            unitNumber: lease.unit.name,
            tenantName: lease.tenant?.name,
          },
        });
      }
    });

    // ── 4. LEASE EXPIRATIONS — Owners & Tenants ──
    if (role !== "INSPECTOR") {
      const expiringLeases = await prisma.lease.findMany({
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

      expiringLeases.forEach((lease) => {
        events.push({
          id: `lease_${lease.id}`,
          title: role === "TENANT"
            ? `Lease End Date (${lease.unit.property.name})`
            : `Lease Expiration — ${lease.tenant.name}`,
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

    // ── 5. PROSPECT PROPERTY TOURS — Owners & Admins only (Excluded for Tenants & Inspectors) ──
    if (role !== "INSPECTOR" && role !== "TENANT") {
      const tours = await prisma.tour.findMany({
        where: {
          scheduledAt: { gte: startDate, lte: endDate },
          status: { not: "CANCELLED" },
          ...(role === "OWNER" ? { property: { ownerId: userId } } : {}),
        },
        include: {
          property: { select: { name: true } },
          unit: { select: { name: true } },
        },
      });

      tours.forEach((tour) => {
        events.push({
          id: `tour_${tour.id}`,
          title: `Property Tour: ${tour.tenantName} (${tour.property.name})`,
          type: "TOUR",
          date: tour.scheduledAt.toISOString(),
          priority: "MEDIUM",
          metadata: {
            tourId: tour.id,
            propertyName: tour.property.name,
            unitNumber: tour.unit?.name,
            tenantName: tour.tenantName,
            tenantEmail: tour.tenantEmail,
            tenantPhone: tour.tenantPhone,
            tourType: tour.tourType,
            status: tour.status,
          },
        });
      });
    }

    // Sort events chronologically ascending
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("Failed to fetch calendar events:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch events" }, { status: 500 });
  }
}
