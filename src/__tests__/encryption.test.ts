/**
 * Unit tests for src/lib/encryption.ts
 * Uses Node.js native test runner (tsx --test)
 *
 * Run: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { encryptSymmetric, decryptSymmetric } from "../lib/encryption";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("encryptSymmetric / decryptSymmetric (AES-256-GCM)", () => {

  it("encrypts and decrypts a plaintext string correctly", () => {
    const original = "1234567890"; // Bank account number style
    const encrypted = encryptSymmetric(original);
    const decrypted = decryptSymmetric(encrypted);

    assert.equal(decrypted, original, "Roundtrip should produce the original string");
    assert.notEqual(encrypted, original, "Encrypted output should not equal plaintext");
    assert.ok(encrypted.length > 50, "Encrypted payload should contain packed hex data");
  });

  it("produces different ciphertext for same input (semantic security)", () => {
    const plaintext = "SensitiveData123";
    const enc1 = encryptSymmetric(plaintext);
    const enc2 = encryptSymmetric(plaintext);

    // Random salt + IV ensures two encryptions of same text must differ
    assert.notEqual(enc1, enc2, "Two encryptions of the same plaintext should differ");

    // But both must decrypt correctly
    assert.equal(decryptSymmetric(enc1), plaintext);
    assert.equal(decryptSymmetric(enc2), plaintext);
  });

  it("encrypts unicode and special characters correctly", () => {
    const original = "こんにちは世界 & 'Quotes' <Tags> 🏡";
    const encrypted = encryptSymmetric(original);
    const decrypted = decryptSymmetric(encrypted);

    assert.equal(decrypted, original, "Unicode roundtrip should be lossless");
  });

  it("returns empty string unchanged for empty input", () => {
    assert.equal(encryptSymmetric(""), "", "Empty string should pass through unchanged");
    assert.equal(decryptSymmetric(""), "", "Empty string should pass through unchanged");
  });

  it("decryptSymmetric uses legacy fallback for short/invalid payloads", () => {
    const shortHex = "deadbeef"; // Too short to be a valid packed payload
    const result = decryptSymmetric(shortHex);
    assert.equal(result, shortHex, "Short payload should return the raw input (legacy fallback)");
  });

  it("returns DECRYPTION_ERROR for tampered ciphertext (GCM auth tag failure)", () => {
    const original = "BankAccount99887";
    const encrypted = encryptSymmetric(original);

    // Tamper with the last 8 hex chars (affects ciphertext integrity)
    const tampered = encrypted.slice(0, encrypted.length - 8) + "ffffffff";

    const result = decryptSymmetric(tampered);
    assert.equal(result, "DECRYPTION_ERROR", "Tampered payload should return DECRYPTION_ERROR");
  });

  it("encrypted output is a valid lowercase hex string", () => {
    const encrypted = encryptSymmetric("TestValue42");
    assert.match(encrypted, /^[0-9a-f]+$/, "Encrypted output must be lowercase hex");
    assert.ok(encrypted.length > 0, "Encrypted output must not be empty");
  });

  it("handles a long string (1000 chars) correctly", () => {
    const original = "A".repeat(1000);
    const encrypted = encryptSymmetric(original);
    const decrypted = decryptSymmetric(encrypted);

    assert.equal(decrypted, original, "Long string roundtrip should match exactly");
  });
});

