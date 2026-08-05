/**
 * Verifies a Cloudflare Turnstile token server-side.
 * Returns true if the visitor is human, false if bot or token invalid.
 *
 * Dev bypass: if TURNSTILE_SECRET_KEY is not set in .env, always returns true
 * so local development works without real Cloudflare keys.
 */
export async function verifyTurnstileToken(token: string | undefined): Promise<boolean> {
  // Dev bypass: no secret key configured — allow through (local dev)
  if (!process.env.TURNSTILE_SECRET_KEY) return true;

  // No token provided — reject (bot bypassed the widget)
  if (!token) return false;

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: token,
        }),
      }
    );

    if (!res.ok) return false;

    const data = await res.json();
    return data.success === true;
  } catch {
    // Network error — fail open to avoid blocking real users during Cloudflare outages
    console.warn("[Turnstile] Verification request failed — failing open");
    return true;
  }
}
