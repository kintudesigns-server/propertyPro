import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard IV length

// Derive a 32-byte key from ENCRYPTION_KEY or a secure fallback using scrypt
const ENCRYPTION_KEY = (() => {
  const keyStr = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "default-fallback-secret-propertypro-32-chars";
  return crypto.scryptSync(keyStr, "propertypro-salt", 32);
})();

/**
 * Encrypt a plain-text string using AES-256-GCM.
 * Returns a colon-separated string: ivHex:authTagHex:encryptedHex
 */
export function encrypt(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  
  return `${iv.toString("hex")}:${authTag.toString()}:${encrypted}`;
}

/**
 * Decrypt a cipher-text string. Supports fallback to plain text if the input
 * is not encrypted or uses a legacy format.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) {
      // Legacy data is not encrypted
      return encryptedText;
    }
    
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted as any, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (err) {
    // Return original input if decryption fails (e.g. legacy plain text)
    return encryptedText;
  }
}
