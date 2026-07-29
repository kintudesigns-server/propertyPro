import { prisma } from "@/lib/prisma";

const globalForOtp = global as unknown as { otpStore: Map<string, { code: string; expiresAt: number }> };
export const memoryOtpStore = globalForOtp.otpStore || new Map<string, { code: string; expiresAt: number }>();
export const otpStore = memoryOtpStore;
if (process.env.NODE_ENV !== "production") globalForOtp.otpStore = memoryOtpStore;

export async function setOtp(key: string, code: string, ttlMs: number = 10 * 60 * 1000): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMs);
  memoryOtpStore.set(key, { code, expiresAt: expiresAt.getTime() });

  try {
    await prisma.otpToken.upsert({
      where: { key },
      update: { code, expiresAt },
      create: { key, code, expiresAt },
    });
  } catch (err) {
    console.warn("[otpStore] Failed to write OTP to DB, fallback to memory:", err);
  }
}

export async function getOtp(key: string): Promise<{ code: string; expiresAt: number } | null> {
  try {
    const record = await prisma.otpToken.findUnique({ where: { key } });
    if (record) {
      if (new Date() > record.expiresAt) {
        await prisma.otpToken.delete({ where: { key } }).catch(() => {});
        return null;
      }
      return { code: record.code, expiresAt: record.expiresAt.getTime() };
    }
  } catch (err) {
    console.warn("[otpStore] DB OTP lookup failed, fallback to memory:", err);
  }

  const mem = memoryOtpStore.get(key);
  if (!mem) return null;
  if (Date.now() > mem.expiresAt) {
    memoryOtpStore.delete(key);
    return null;
  }
  return mem;
}

export async function verifyAndClearOtp(key: string, code: string): Promise<boolean> {
  const otp = await getOtp(key);
  if (!otp) return false;

  const isValid = otp.code.trim() === code.trim();
  if (isValid) {
    memoryOtpStore.delete(key);
    try {
      await prisma.otpToken.delete({ where: { key } }).catch(() => {});
    } catch (_) {}
  }
  return isValid;
}
