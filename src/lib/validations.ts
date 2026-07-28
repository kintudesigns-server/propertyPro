import { z } from "zod";

// ─── Auth & User ──────────────────────────────────────────────────────────────

export const registerOwnerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  phone: z.string().min(7).max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const sendOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  propertyId: z.string().min(1, "Property ID is required"),
  unitId: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  key: z.string().min(1, "OTP key is required"),
  code: z.string().length(6, "OTP must be 6 digits"),
});

// ─── Payments & Billing ───────────────────────────────────────────────────────

export const createPaymentIntentSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID format"),
  amount: z.number().int().positive("Amount must be a positive integer (cents)").optional(),
  currency: z.string().length(3, "Currency must be a 3-letter ISO code").default("usd").optional(),
});

export const subscriptionOverrideSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  blockPayouts: z.boolean().nullable().optional(),
  blockNewUnits: z.boolean().nullable().optional(),
  allowMaintenance: z.boolean().nullable().optional(),
  allowAddVendor: z.boolean().nullable().optional(),
  allowAddInspector: z.boolean().nullable().optional(),
  allowProcessApplications: z.boolean().nullable().optional(),
  allowAddTenant: z.boolean().nullable().optional(),
  allowTourSlots: z.boolean().nullable().optional(),
  extendedGraceDays: z.number().min(1).max(365).optional(),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(500),
  expiresAt: z.string().nullable().optional(),
  emergencyGrantReason: z.string().max(500).nullable().optional(),
  emergencyGrantedAt: z.string().nullable().optional(),
});

export const moduleGrantSchema = z.object({
  module: z.string().min(1, "Module name is required"),
  overrideType: z.enum(["GRANT", "BLOCK"]),
  reason: z.string().min(3, "Reason must be at least 3 characters").max(300),
  expiresAt: z.string().nullable().optional(),
});

// ─── Properties & Units ───────────────────────────────────────────────────────

export const createPropertySchema = z.object({
  name: z.string().min(2).max(200),
  address: z.string().min(5).max(300),
  city: z.string().min(2).max(100),
  state: z.string().max(100).optional(),
  country: z.string().min(2).max(100),
  zip: z.string().max(20).optional(),
  type: z.enum(["Apartment", "House", "Condo", "Commercial", "Land"]).optional(),
  description: z.string().max(2000).optional(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear() + 5).optional(),
  parkingSpaces: z.number().int().min(0).optional(),
});

export const createUnitSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().max(50).optional(),
  floor: z.number().int().optional(),
  rentAmount: z.number().positive("Rent must be positive"),
  depositAmt: z.number().min(0),
  rooms: z.number().int().min(0),
  bathrooms: z.number().int().min(0).optional(),
  sqFootage: z.number().int().min(1),
  maxOccupants: z.number().int().min(1).default(1),
  amenities: z.array(z.string()).optional(),
});

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminUserAccessOverrideSchema = z.object({
  feature: z.string().min(1, "Feature key is required"),
  overrideType: z.enum(["BLOCK", "GRANT"]),
  reason: z.string().min(5, "Reason must be at least 5 characters").max(500),
  expiresAt: z.string().nullable().optional(),
});

export const platformSettingsSchema = z.object({
  gracePeriodDays: z.number().int().min(0).max(90),
  adminFeePercent: z.number().min(0).max(50),
  blockPayoutsOnPastDue: z.boolean(),
  blockPayoutsOnPaused: z.boolean(),
  blockNewUnitsOnPaused: z.boolean(),
  allowMaintenanceOnPaused: z.boolean(),
  blockAddVendorOnPaused: z.boolean(),
  blockAddInspectorOnPaused: z.boolean(),
  blockProcessApplicationsOnPaused: z.boolean(),
  blockAddTenantOnPaused: z.boolean(),
  blockTourSlotsOnPaused: z.boolean(),
  welfareAllowMoveOut: z.boolean().optional(),
  welfareAllowBillingView: z.boolean().optional(),
  welfareAllowEmergencyDispatch: z.boolean().optional(),
});
