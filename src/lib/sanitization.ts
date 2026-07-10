import { decrypt } from "@/lib/encryption";

export function maskBankDetails(accountNumber?: string | null, routingNumber?: string | null) {
  const result: { accountNumber?: string; routingNumber?: string } = {};
  if (accountNumber) {
    const len = accountNumber.length;
    result.accountNumber = len > 4 
      ? "*".repeat(len - 4) + accountNumber.slice(-4) 
      : "****";
  }
  if (routingNumber) {
    const len = routingNumber.length;
    result.routingNumber = len > 3 
      ? "*".repeat(len - 3) + routingNumber.slice(-3) 
      : "***";
  }
  return result;
}

function decryptSafe(val: string | null | undefined): string | null {
  if (!val) return null;
  try {
    return decrypt(val);
  } catch {
    // If it's already plaintext, return it as-is
    return val;
  }
}

export function sanitizeVendor(vendor: any) {
  if (!vendor) return vendor;
  const sanitized = { ...vendor };
  
  const acc = decryptSafe(sanitized.accountNumber);
  const rout = decryptSafe(sanitized.routingNumber);

  if (acc) {
    const masked = maskBankDetails(acc, rout);
    sanitized.accountNumber = masked.accountNumber;
    if (sanitized.routingNumber) sanitized.routingNumber = masked.routingNumber;
  }
  return sanitized;
}

export function maskSSN(ssn?: string | null) {
  if (!ssn) return ssn;
  const digitsOnly = ssn.replace(/\D/g, "");
  if (digitsOnly.length >= 4) {
    return `***-**-${digitsOnly.slice(-4)}`;
  }
  return "***-**-****";
}

export function sanitizeUser(user: any) {
  if (!user) return user;
  const { password, ...sanitized } = user;
  
  const acc = decryptSafe(sanitized.accountNumber);
  const ssnVal = decryptSafe(sanitized.ssn);

  if (acc) {
    const masked = maskBankDetails(acc, null);
    sanitized.accountNumber = masked.accountNumber;
  }
  if (ssnVal) {
    sanitized.ssn = maskSSN(ssnVal);
  }
  return sanitized;
}
