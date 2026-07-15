// Global OTP store for development and MVP
// Maps leaseId -> { code: string, expiresAt: number }
const globalForOtp = global as unknown as { otpStore: Map<string, { code: string; expiresAt: number }> };

export const otpStore = globalForOtp.otpStore || new Map<string, { code: string; expiresAt: number }>();

if (process.env.NODE_ENV !== "production") globalForOtp.otpStore = otpStore;
