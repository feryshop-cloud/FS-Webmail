"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { cookies } from "next/headers";
import { signMailboxAuthToken, verifyMailboxAuthToken } from "@/lib/auth/signed-token";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rate-limit";

export async function verifyMailboxAccess(
  email: string,
  pin?: string | null,
): Promise<{ success: boolean; message?: string }> {
  if (!email || !email.includes("@")) {
    return { success: false, message: "Format alamat email tidak valid." };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPin = (pin || "").trim();

  // 1. Rate Limiting Check (max 5 failed attempts per 10 minutes)
  const rateLimitKey = `auth:${cleanEmail}`;
  const rateLimitStatus = checkRateLimit(rateLimitKey);
  if (!rateLimitStatus.allowed) {
    logger.warn("Mailbox access rate limited", {
      email: cleanEmail,
      retryAfterSeconds: rateLimitStatus.retryAfterSeconds,
    });
    return {
      success: false,
      message: `Terlalu banyak percobaan gagal. Silakan coba lagi dalam ${rateLimitStatus.retryAfterSeconds} detik.`,
    };
  }

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("email_accounts")
    .select("id, email, access_pin, is_active, is_pin_enabled")
    .eq("email", cleanEmail)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    logger.error("Error verifying mailbox access", {
      context: "ServerAction: verifyMailboxAccess",
      err: error,
      email: cleanEmail,
    });
    return {
      success: false,
      message: "Terjadi kesalahan sistem saat memverifikasi akun.",
    };
  }

  if (!data) {
    recordFailedAttempt(rateLimitKey);
    return {
      success: false,
      message: "Email atau PIN Akses tidak valid. Pastikan alamat email yang Anda masukkan benar.",
    };
  }

  const isPinEnabled = (data as { is_pin_enabled?: boolean | null }).is_pin_enabled !== false;

  if (isPinEnabled) {
    if (!cleanPin) {
      recordFailedAttempt(rateLimitKey);
      return {
        success: false,
        message: "Alamat email ini membutuhkan PIN Akses. Silakan masukkan PIN transaksi Anda.",
      };
    }

    const expectedPin = data.access_pin || "123456";
    if (cleanPin !== expectedPin) {
      recordFailedAttempt(rateLimitKey);
      return {
        success: false,
        message: "PIN Akses / Password Mailbox salah. Harap periksa nota transaksi Anda.",
      };
    }
  }

  // Verification succeeded -> reset failed attempt counter
  resetRateLimit(rateLimitKey);

  // Set HTTP-only, HMAC-signed authorization cookie for this mailbox
  const cookieStore = await cookies();
  const cookieName = `mailbox_auth_${Buffer.from(cleanEmail).toString("hex")}`;
  const signedToken = await signMailboxAuthToken(cleanEmail);

  cookieStore.set(cookieName, signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return { success: true };
}

export async function getMailboxPinStatus(
  email: string,
): Promise<{ exists: boolean; is_pin_enabled: boolean }> {
  if (!email || !email.includes("@")) {
    return { exists: false, is_pin_enabled: true };
  }

  const cleanEmail = email.trim().toLowerCase();
  const supabase = createSupabaseServerClient();

  const { data } = await supabase
    .from("email_accounts")
    .select("id, email, is_pin_enabled, is_active")
    .eq("email", cleanEmail)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) {
    return { exists: false, is_pin_enabled: true };
  }

  return {
    exists: true,
    is_pin_enabled: (data as { is_pin_enabled?: boolean | null }).is_pin_enabled !== false,
  };
}

export async function isMailboxAuthorized(email: string): Promise<boolean> {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  const cookieStore = await cookies();
  const cookieName = `mailbox_auth_${Buffer.from(cleanEmail).toString("hex")}`;
  const authCookie = cookieStore.get(cookieName);

  return await verifyMailboxAuthToken(cleanEmail, authCookie?.value);
}

export async function revokeMailboxAccess(email: string): Promise<void> {
  if (!email) return;
  const cleanEmail = email.trim().toLowerCase();
  const cookieStore = await cookies();
  const cookieName = `mailbox_auth_${Buffer.from(cleanEmail).toString("hex")}`;
  cookieStore.delete(cookieName);
}
