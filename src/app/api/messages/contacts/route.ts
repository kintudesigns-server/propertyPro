import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role as Role;

  try {
    let contacts: any[] = [];

    // Admins can see all users
    if (role === Role.SUPERADMIN) {
      contacts = await prisma.user.findMany({
        where: {
          id: { not: userId }
        },
        select: { id: true, name: true, email: true, role: true }
      });
    }
    // Owner can message:
    // 1. Tenants with active leases on their properties
    // 2. All inspectors
    // 3. Super admins
    else if (role === Role.OWNER) {
      const units = await prisma.unit.findMany({
        where: {
          property: {
            ownerId: userId
          }
        },
        include: {
          leases: {
            where: {
              status: "ACTIVE"
            },
            select: {
              tenantId: true
            }
          }
        }
      });
      const tenantIds = Array.from(new Set(units.flatMap(u => u.leases.map(l => l.tenantId))));

      const users = await prisma.user.findMany({
        where: {
          OR: [
            { id: { in: tenantIds } },
            { role: Role.INSPECTOR },
            { role: Role.SUPERADMIN }
          ],
          id: { not: userId }
        },
        select: { id: true, name: true, email: true, role: true }
      });
      contacts = users;
    }
    // Tenant can message:
    // 1. Owners of their properties
    // 2. Inspectors assigned to their maintenance requests
    // 3. Super admins
    else if (role === Role.TENANT) {
      const leases = await prisma.lease.findMany({
        where: {
          tenantId: userId,
          status: "ACTIVE"
        },
        include: {
          unit: {
            include: {
              property: {
                select: {
                  ownerId: true
                }
              }
            }
          }
        }
      });
      const ownerIds = Array.from(new Set(leases.map(l => l.unit?.property?.ownerId).filter(Boolean))) as string[];

      const maintenanceRequests = await prisma.maintenanceRequest.findMany({
        where: {
          tenantId: userId,
          inspectorId: { not: null }
        },
        select: {
          inspectorId: true
        }
      });
      const inspectorIds = Array.from(new Set(maintenanceRequests.map(r => r.inspectorId).filter(Boolean))) as string[];

      const users = await prisma.user.findMany({
        where: {
          OR: [
            { id: { in: ownerIds } },
            { id: { in: inspectorIds } },
            { role: Role.SUPERADMIN }
          ],
          id: { not: userId }
        },
        select: { id: true, name: true, email: true, role: true }
      });
      contacts = users;
    }
    // Inspector can message:
    // 1. Owners of properties they have requests for
    // 2. Tenants of units they have requests for
    // 3. Super admins
    else if (role === Role.INSPECTOR) {
      const requests = await prisma.maintenanceRequest.findMany({
        where: {
          inspectorId: userId
        },
        include: {
          unit: {
            include: {
              property: {
                select: {
                  ownerId: true
                }
              }
            }
          }
        }
      });
      const ownerIds = Array.from(new Set(requests.map(r => r.unit?.property?.ownerId).filter(Boolean))) as string[];
      const tenantIds = Array.from(new Set(requests.map(r => r.tenantId).filter(Boolean))) as string[];

      const users = await prisma.user.findMany({
        where: {
          OR: [
            { id: { in: ownerIds } },
            { id: { in: tenantIds } },
            { role: Role.SUPERADMIN }
          ],
          id: { not: userId }
        },
        select: { id: true, name: true, email: true, role: true }
      });
      contacts = users;
    }

    return NextResponse.json(contacts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch contacts" }, { status: 500 });
  }
}
