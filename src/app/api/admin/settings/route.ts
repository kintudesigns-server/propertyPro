import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { invalidateSettingsCache } from "@/lib/subscription-rules";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let settings = await prisma.platformSettings.findFirst();
    if (!settings) {
      // Seed default settings if none exist
      settings = await prisma.platformSettings.create({
        data: { adminFeePercent: 2.00 },
      });
    }
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { 
      adminFeePercent, 
      tourMaxRequestsPerEmail, 
      tourRateLimitWindowHours, 
      tourOtpExpiryMinutes,
      gracePeriodDays,
      blockPayoutsOnPastDue,
      blockPayoutsOnPaused,
      blockNewUnitsOnPaused,
      allowMaintenanceOnPaused,
      blockAddVendorOnPaused,
      blockAddInspectorOnPaused,
      blockAddTenantOnPaused,
      blockTourSlotsOnPaused,
    } = await req.json();

    if (adminFeePercent !== undefined && (adminFeePercent < 0 || adminFeePercent > 100)) {
      return NextResponse.json({ error: "Invalid percentage" }, { status: 400 });
    }

    let settings = await prisma.platformSettings.findFirst();
    
    const updateData: any = {};
    if (adminFeePercent !== undefined) updateData.adminFeePercent = adminFeePercent;
    if (tourMaxRequestsPerEmail !== undefined) updateData.tourMaxRequestsPerEmail = Number(tourMaxRequestsPerEmail);
    if (tourRateLimitWindowHours !== undefined) updateData.tourRateLimitWindowHours = Number(tourRateLimitWindowHours);
    if (tourOtpExpiryMinutes !== undefined) updateData.tourOtpExpiryMinutes = Number(tourOtpExpiryMinutes);
    if (gracePeriodDays !== undefined) updateData.gracePeriodDays = Number(gracePeriodDays);
    if (blockPayoutsOnPastDue !== undefined) updateData.blockPayoutsOnPastDue = Boolean(blockPayoutsOnPastDue);
    if (blockPayoutsOnPaused !== undefined) updateData.blockPayoutsOnPaused = Boolean(blockPayoutsOnPaused);
    if (blockNewUnitsOnPaused !== undefined) updateData.blockNewUnitsOnPaused = Boolean(blockNewUnitsOnPaused);
    if (allowMaintenanceOnPaused !== undefined) updateData.allowMaintenanceOnPaused = Boolean(allowMaintenanceOnPaused);
    if (blockAddVendorOnPaused !== undefined) updateData.blockAddVendorOnPaused = Boolean(blockAddVendorOnPaused);
    if (blockAddInspectorOnPaused !== undefined) updateData.blockAddInspectorOnPaused = Boolean(blockAddInspectorOnPaused);
    if (blockAddTenantOnPaused !== undefined) updateData.blockAddTenantOnPaused = Boolean(blockAddTenantOnPaused);
    if (blockTourSlotsOnPaused !== undefined) updateData.blockTourSlotsOnPaused = Boolean(blockTourSlotsOnPaused);

    if (settings) {
      settings = await prisma.platformSettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    } else {
      settings = await prisma.platformSettings.create({
        data: {
          adminFeePercent: adminFeePercent !== undefined ? adminFeePercent : 2.00,
          tourMaxRequestsPerEmail: tourMaxRequestsPerEmail !== undefined ? Number(tourMaxRequestsPerEmail) : 3,
          tourRateLimitWindowHours: tourRateLimitWindowHours !== undefined ? Number(tourRateLimitWindowHours) : 24,
          tourOtpExpiryMinutes: tourOtpExpiryMinutes !== undefined ? Number(tourOtpExpiryMinutes) : 10,
          gracePeriodDays: gracePeriodDays !== undefined ? Number(gracePeriodDays) : 7,
          blockPayoutsOnPastDue: blockPayoutsOnPastDue !== undefined ? Boolean(blockPayoutsOnPastDue) : true,
          blockPayoutsOnPaused: blockPayoutsOnPaused !== undefined ? Boolean(blockPayoutsOnPaused) : true,
          blockNewUnitsOnPaused: blockNewUnitsOnPaused !== undefined ? Boolean(blockNewUnitsOnPaused) : true,
          allowMaintenanceOnPaused: allowMaintenanceOnPaused !== undefined ? Boolean(allowMaintenanceOnPaused) : true,
          blockAddVendorOnPaused: blockAddVendorOnPaused !== undefined ? Boolean(blockAddVendorOnPaused) : true,
          blockAddInspectorOnPaused: blockAddInspectorOnPaused !== undefined ? Boolean(blockAddInspectorOnPaused) : true,
          blockAddTenantOnPaused: blockAddTenantOnPaused !== undefined ? Boolean(blockAddTenantOnPaused) : true,
          blockTourSlotsOnPaused: blockTourSlotsOnPaused !== undefined ? Boolean(blockTourSlotsOnPaused) : true,
        },
      });
    }

    // Invalidate rule engine in-process settings cache on save
    invalidateSettingsCache();

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
