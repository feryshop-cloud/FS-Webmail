"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { cookies } from "next/headers";

export async function verifyMailboxAccess(
  email: string,
  pin: string,
): Promise<{ success: boolean; message?: string }> {
  if (!email || !email.includes("@")) {
    return { success: false, message: "Format alamat email tidak valid." };
  }

  if (!pin || pin.trim().length === 0) {
    return { success: false, message: "PIN Akses / Password Mailbox wajib diisi." };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPin = pin.trim();
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("email_accounts")
    .select("id, email, access_pin, is_active")
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
    return {
      success: false,
      message:
        "Alamat email tidak ditemukan di database Feryshop. Pastikan email akun yang Anda masukkan benar.",
    };
  }

  const expectedPin = data.access_pin || "123456";
  if (cleanPin !== expectedPin) {
    return {
      success: false,
      message: "PIN Akses / Password Mailbox salah. Harap periksa nota transaksi Anda.",
    };
  }

  // Set HTTP-only authorization cookie for this mailbox
  const cookieStore = await cookies();
  const cookieName = `mailbox_auth_${Buffer.from(cleanEmail).toString("hex")}`;

  cookieStore.set(cookieName, "authorized", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return { success: true };
}

export async function isMailboxAuthorized(email: string): Promise<boolean> {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  const cookieStore = await cookies();
  const cookieName = `mailbox_auth_${Buffer.from(cleanEmail).toString("hex")}`;
  const authCookie = cookieStore.get(cookieName);
  return authCookie?.value === "authorized";
}

export async function revokeMailboxAccess(email: string): Promise<void> {
  if (!email) return;
  const cleanEmail = email.trim().toLowerCase();
  const cookieStore = await cookies();
  const cookieName = `mailbox_auth_${Buffer.from(cleanEmail).toString("hex")}`;
  cookieStore.delete(cookieName);
}
