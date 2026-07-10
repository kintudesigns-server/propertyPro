import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { decrypt } from "@/lib/encryption"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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

export function sanitizeVendor(vendor: any) {
  if (!vendor) return vendor;
  const sanitized = { ...vendor };
  
  const decryptedAccountNumber = sanitized.accountNumber ? decrypt(sanitized.accountNumber) : null;
  const decryptedRoutingNumber = sanitized.routingNumber ? decrypt(sanitized.routingNumber) : null;

  if (decryptedAccountNumber) {
    const masked = maskBankDetails(decryptedAccountNumber, decryptedRoutingNumber);
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
  
  const decryptedAccountNumber = sanitized.accountNumber ? decrypt(sanitized.accountNumber) : null;
  const decryptedSSN = sanitized.ssn ? decrypt(sanitized.ssn) : null;

  if (decryptedAccountNumber) {
    const masked = maskBankDetails(decryptedAccountNumber, null);
    sanitized.accountNumber = masked.accountNumber;
  }
  if (decryptedSSN) {
    sanitized.ssn = maskSSN(decryptedSSN);
  }
  return sanitized;
}

