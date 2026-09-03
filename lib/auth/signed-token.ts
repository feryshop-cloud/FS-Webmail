/**
 * HMAC-SHA256 Signed Token generator and verifier for WebMail mailbox session.
 * Uses Web Crypto API (supported natively in Node.js 18+, Bun, Deno, and Edge).
 */

const SECRET_KEY =
  process.env.SESSION_SECRET ||
  process.env.SUPABASE_JWT_SECRET ||
  "feryshop-webmail-auth-secure-hmac-secret-v1";

function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export interface MailboxTokenPayload {
  email: string;
  exp: number; // Unix timestamp in ms
  iat: number;
}

/**
 * Generate a cryptographically signed HMAC token for a given email.
 */
export async function signMailboxAuthToken(email: string, expiresInDays = 7): Promise<string> {
  const cleanEmail = email.trim().toLowerCase();
  const now = Date.now();
  const payload: MailboxTokenPayload = {
    email: cleanEmail,
    iat: now,
    exp: now + expiresInDays * 24 * 60 * 60 * 1000,
  };

  const payloadEncoded = bufferToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));

  const key = await getCryptoKey();
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadEncoded),
  );

  const signatureEncoded = bufferToBase64Url(signatureBuffer);
  return `${payloadEncoded}.${signatureEncoded}`;
}

/**
 * Verify that a token is valid, matches the email, has not expired,
 * and possesses a valid cryptographic HMAC signature.
 */
export async function verifyMailboxAuthToken(
  email: string,
  token: string | null | undefined,
): Promise<boolean> {
  if (!token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payloadEncoded, signatureEncoded] = parts;

  try {
    const key = await getCryptoKey();
    const signatureBytes = base64UrlToUint8Array(signatureEncoded);
    const dataBytes = new TextEncoder().encode(payloadEncoded);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as unknown as BufferSource,
      dataBytes,
    );

    if (!isValid) return false;

    const payloadJson = new TextDecoder().decode(base64UrlToUint8Array(payloadEncoded));
    const payload: MailboxTokenPayload = JSON.parse(payloadJson);

    // Validate email match
    if (payload.email.toLowerCase() !== email.trim().toLowerCase()) {
      return false;
    }

    // Validate expiration
    if (Date.now() > payload.exp) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
