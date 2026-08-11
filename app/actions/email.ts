"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function checkEmailAccountExists(
  email: string,
): Promise<{ exists: boolean; message?: string }> {
  if (!email || !email.includes("@")) {
    return { exists: false, message: "Format alamat email tidak valid." };
  }

  const cleanEmail = email.trim().toLowerCase();
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("email_accounts")
    .select("id")
    .eq("email", cleanEmail)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Error checking email_accounts existence:", error);
    return {
      exists: false,
      message: "Terjadi kesalahan sistem saat mengecek alamat email.",
    };
  }

  if (!data) {
    return {
      exists: false,
      message:
        "Alamat email tidak ditemukan di database Feryshop. Pastikan email akun yang Anda masukkan benar.",
    };
  }

  return { exists: true };
}
