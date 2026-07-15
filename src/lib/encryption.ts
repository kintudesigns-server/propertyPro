import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

// For prototype/demo, we use a static fallback if the env var isn't set, 
// but in production this must be a securely generated 32-byte hex string in .env
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef';

/**
 * Encrypts a string (e.g., bank account number) using AES-256-GCM.
 * The output is a single hex string containing the salt, IV, auth tag, and ciphertext.
 * This format allows it to be safely stored in a standard database string column.
 */
export function encryptSymmetric(text: string): string {
  if (!text) return text;
  
  // Create a 256-bit key buffer from the hex key
  const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('Invalid ENCRYPTION_KEY length. Must be 64 hex characters (32 bytes).');
  }

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // We derive the actual working key using pbkdf2 to add brute-force resistance
  const derivedKey = crypto.pbkdf2Sync(keyBuffer, salt, 100000, 32, 'sha512');

  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Pack the payload: [salt][iv][authTag][encryptedData]
  const payload = Buffer.concat([salt, iv, authTag, encrypted]);
  
  return payload.toString('hex');
}

/**
 * Decrypts a string previously encrypted with `encryptSymmetric`.
 */
export function decryptSymmetric(hexPayload: string): string {
  if (!hexPayload || hexPayload.length < ENCRYPTED_POSITION * 2) {
    // If it's not a valid encrypted hex string, it might be an old unencrypted record (legacy fallback)
    return hexPayload;
  }

  try {
    const payload = Buffer.from(hexPayload, 'hex');
    
    // Extract pieces
    const salt = payload.subarray(0, SALT_LENGTH);
    const iv = payload.subarray(SALT_LENGTH, TAG_POSITION);
    const authTag = payload.subarray(TAG_POSITION, ENCRYPTED_POSITION);
    const encryptedText = payload.subarray(ENCRYPTED_POSITION);

    const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
    const derivedKey = crypto.pbkdf2Sync(keyBuffer, salt, 100000, 32, 'sha512');

    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error("Failed to decrypt payload:", error);
    // If decryption fails, it might be legacy plaintext data or corrupt
    return "DECRYPTION_ERROR";
  }
}
