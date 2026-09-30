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
  try {
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

    let supabase;
    try {
      supabase = createSupabaseServerClient();
    } catch (clientErr) {
      logger.error("Failed to initialize Supabase client in verifyMailboxAccess", {
        context: "ServerAction: verifyMailboxAccess",
        err: clientErr instanceof Error ? clientErr.message : String(clientErr),
        email: cleanEmail,
      });
      return {
        success: false,
        message: "Konfigurasi server database bermasalah. Harap hubungi admin.",
      };
    }

    const { data, error } = await supabase
      .from("email_accounts")
      .select("id, email, access_password, is_active, is_password_enabled")
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
        message:
          "Email atau PIN Akses tidak valid. Pastikan alamat email yang Anda masukkan benar.",
      };
    }

    const isPinEnabled =
      (data as { is_password_enabled?: boolean | null }).is_password_enabled !== false;

    if (isPinEnabled) {
      if (!cleanPin) {
        recordFailedAttempt(rateLimitKey);
        return {
          success: false,
          message: "Alamat email ini membutuhkan PIN Akses. Silakan masukkan PIN transaksi Anda.",
        };
      }

      const expectedPin = data.access_password || "123456";
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

    // Enforce single-mailbox session: clear any existing mailbox_auth cookies
    const cookieStore = await cookies();
    if (typeof cookieStore.getAll === "function") {
      for (const cookie of cookieStore.getAll()) {
        if (cookie.name.startsWith("mailbox_auth_")) {
          cookieStore.delete(cookie.name);
        }
      }
    }

    // Set HTTP-only, HMAC-signed authorization cookie for this mailbox
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
  } catch (err) {
    logger.error("Unexpected error in verifyMailboxAccess", {
      context: "ServerAction: verifyMailboxAccess",
      err: err instanceof Error ? err.message : String(err),
    });
    return {
      success: false,
      message: "Terjadi kesalahan tak terduga pada server.",
    };
  }
}

export async function getMailboxPinStatus(
  email: string,
): Promise<{ exists: boolean; is_pin_enabled: boolean }> {
  try {
    if (!email || !email.includes("@")) {
      return { exists: false, is_pin_enabled: true };
    }

    const cleanEmail = email.trim().toLowerCase();

    let supabase;
    try {
      supabase = createSupabaseServerClient();
    } catch (clientErr) {
      logger.error("Failed to initialize Supabase client in getMailboxPinStatus", {
        context: "ServerAction: getMailboxPinStatus",
        err: clientErr instanceof Error ? clientErr.message : String(clientErr),
        email: cleanEmail,
      });
      return { exists: false, is_pin_enabled: true };
    }

    const { data, error } = await supabase
      .from("email_accounts")
      .select("id, email, is_password_enabled, is_active")
      .eq("email", cleanEmail)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      logger.error("Error checking mailbox pin status", {
        context: "ServerAction: getMailboxPinStatus",
        err: error,
        email: cleanEmail,
      });
      return { exists: false, is_pin_enabled: true };
    }

    if (!data) {
      return { exists: false, is_pin_enabled: true };
    }

    return {
      exists: true,
      is_pin_enabled: (data as { is_password_enabled?: boolean | null }).is_password_enabled !==
        false,
    };
  } catch (err) {
    logger.error("Unexpected error in getMailboxPinStatus", {
      context: "ServerAction: getMailboxPinStatus",
      err: err instanceof Error ? err.message : String(err),
    });
    return { exists: false, is_pin_enabled: true };
  }
}

export async function isMailboxAuthorized(email: string): Promise<boolean> {
  try {
    if (!email) return false;
    const cleanEmail = email.trim().toLowerCase();
    const cookieStore = await cookies();
    const cookieName = `mailbox_auth_${Buffer.from(cleanEmail).toString("hex")}`;
    const authCookie = cookieStore.get(cookieName);

    return await verifyMailboxAuthToken(cleanEmail, authCookie?.value);
  } catch (err) {
    logger.error("Unexpected error in isMailboxAuthorized", {
      context: "ServerAction: isMailboxAuthorized",
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export async function revokeMailboxAccess(email?: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const cookieName = `mailbox_auth_${Buffer.from(cleanEmail).toString("hex")}`;
      cookieStore.delete(cookieName);
    }
    // Also remove any remaining mailbox_auth_ cookies to guarantee clean logout
    if (typeof cookieStore.getAll === "function") {
      for (const cookie of cookieStore.getAll()) {
        if (cookie.name.startsWith("mailbox_auth_")) {
          cookieStore.delete(cookie.name);
        }
      }
    }
  } catch (err) {
    logger.error("Unexpected error in revokeMailboxAccess", {
      context: "ServerAction: revokeMailboxAccess",
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

type MailboxEmailAction = "archive" | "unarchive" | "delete";

const MAILBOX_EMAIL_ACTION_MESSAGES: Record<MailboxEmailAction, string> = {
  archive: "Email diarsipkan.",
  unarchive: "Email dikeluarkan dari arsip.",
  delete: "Email dihapus.",
};

async function invokeMailboxEmailAction(
  email: string,
  emailId: string,
  action: MailboxEmailAction,
): Promise<{ success: boolean; message?: string }> {
  try {
    if (!email || !email.includes("@")) {
      return { success: false, message: "Format alamat email tidak valid." };
    }
    if (!emailId) {
      return { success: false, message: "ID email tidak valid." };
    }

    const cleanEmail = email.trim().toLowerCase();

    // Syarat: sesi mailbox (cookie HMAC hasil verifikasi PIN) masih berlaku.
    const authorized = await isMailboxAuthorized(cleanEmail);
    if (!authorized) {
      return {
        success: false,
        message: "Sesi mailbox berakhir. Silakan buka ulang inbox.",
      };
    }

    // Teruskan token HMAC httpOnly ke Edge Function sebagai bukti kepemilikan.
    // Token tidak pernah menyentuh service_role_key (hanya hidup di Edge Function).
    const cookieStore = await cookies();
    const cookieName = `mailbox_auth_${Buffer.from(cleanEmail).toString("hex")}`;
    const mailboxToken = cookieStore.get(cookieName)?.value;
    if (!mailboxToken) {
      return {
        success: false,
        message: "Sesi mailbox berakhir. Silakan buka ulang inbox.",
      };
    }

    let supabase;
    try {
      supabase = createSupabaseServerClient();
    } catch (clientErr) {
      logger.error("Failed to initialize Supabase client in invokeMailboxEmailAction", {
        context: "ServerAction: invokeMailboxEmailAction",
        err: clientErr instanceof Error ? clientErr.message : String(clientErr),
        email: cleanEmail,
      });
      return {
        success: false,
        message: "Konfigurasi server database bermasalah. Harap hubungi admin.",
      };
    }

    const { data, error } = await supabase.functions.invoke("mailbox-email-actions", {
      body: {
        recipient_email: cleanEmail,
        email_id: emailId,
        action,
        mailbox_token: mailboxToken,
      },
    });

    if (error) {
      logger.error("Edge Function mailbox-email-actions invoke failed", {
        context: "ServerAction: invokeMailboxEmailAction",
        err: error.message,
        email: cleanEmail,
        action,
      });
      return { success: false, message: "Gagal memproses permintaan. Silakan coba lagi." };
    }

    if (data?.error) {
      return { success: false, message: data.error };
    }

    return { success: true, message: data?.message || MAILBOX_EMAIL_ACTION_MESSAGES[action] };
  } catch (err) {
    logger.error("Unexpected error in invokeMailboxEmailAction", {
      context: "ServerAction: invokeMailboxEmailAction",
      err: err instanceof Error ? err.message : String(err),
    });
    return { success: false, message: "Terjadi kesalahan tak terduga pada server." };
  }
}

export async function archiveMailboxEmail(
  email: string,
  emailId: string,
  archived = true,
): Promise<{ success: boolean; message?: string }> {
  return invokeMailboxEmailAction(email, emailId, archived ? "archive" : "unarchive");
}

export async function deleteMailboxEmail(
  email: string,
  emailId: string,
): Promise<{ success: boolean; message?: string }> {
  return invokeMailboxEmailAction(email, emailId, "delete");
}
