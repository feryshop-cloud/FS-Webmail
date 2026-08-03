// Supabase Edge Function: change-mailbox-password
// Referensi: prd.md Bab 4.2, FR-11 s/d FR-15
//
// Tugas:
// 1. Validasi payload
// 2. Cocokkan otp_verification dengan otp_code TERBARU di incoming_emails
// 3. Rate limiting: max 5x/jam per email
// 4. Jika cocok -> update password via cPanel UAPI
// 5. Return success atau error

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Environment variables (di-set di Supabase Dashboard -> Edge Functions -> Secrets)
const SB_URL = Deno.env.get("SB_URL") || "";
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY") || "";
const CPANEL_USER = Deno.env.get("CPANEL_USER") || "feryshop";
const CPANEL_AUTH = Deno.env.get("CPANEL_AUTH") || ""; // API token WHM/cPanel

async function checkRateLimitSQL(email: string, supabase: any): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  
  // Ambil record rate limit dalam 1 jam terakhir
  const { data, error } = await supabase
    .from('rate_limit_attempts')
    .select('id, attempt_count')
    .eq('email', email)
    .gte('window_start', oneHourAgo)
    .order('window_start', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    // Error selain Not Found
    console.error('Rate limit query error:', error);
    return false; 
  }

  if (data) {
    if (data.attempt_count >= 5) {
      return false; // Terlalu banyak percobaan
    }
    // Update attempt count
    await supabase
      .from('rate_limit_attempts')
      .update({ attempt_count: data.attempt_count + 1 })
      .eq('id', data.id);
    return true;
  } else {
    // Belum ada percobaan dalam 1 jam terakhir, buat baru
    await supabase
      .from('rate_limit_attempts')
      .insert([{ email: email, attempt_count: 1 }]);
    return true;
  }
}

Deno.serve(async (req) => {
  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers }
    );
  }

  try {
    const body = await req.json();
    const { recipient_email, otp_verification, new_password } = body;

    // --- Validasi payload ---
    if (!recipient_email || !otp_verification || !new_password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers }
      );
    }

    // Validasi format email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(recipient_email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers }
      );
    }

    // Validasi password min 8 karakter (FR-11)
    if (new_password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers }
      );
    }

    // --- Inisialisasi Supabase client dengan service role key ---
    const supabase = createClient(SB_URL, SB_SERVICE_ROLE_KEY);

    // --- Rate limiting SQL (FR-13) ---
    if (!(await checkRateLimitSQL(recipient_email, supabase))) {
      return new Response(
        JSON.stringify({ error: "Too many attempts. Try again in 1 hour." }),
        { status: 429, headers }
      );
    }

    // --- Cari otp_code TERBARU untuk recipient_email (FR-11) ---
    // Hanya email dengan visibility = 'buyer' dan category = 'login_otp'
    const { data: latestEmail, error: queryError } = await supabase
      .from("incoming_emails")
      .select("otp_code, received_at")
      .eq("recipient_email", recipient_email)
      .eq("visibility", "buyer")
      .eq("category", "login_otp")
      .order("received_at", { ascending: false })
      .limit(1)
      .single();

    if (queryError || !latestEmail) {
      return new Response(
        JSON.stringify({ error: "No OTP found for this email" }),
        { status: 400, headers }
      );
    }

    // --- Cocokkan OTP (FR-12) ---
    if (latestEmail.otp_code !== otp_verification) {
      return new Response(
        JSON.stringify({ error: "Verification code does not match" }),
        { status: 400, headers }
      );
    }

    // --- Update password via cPanel UAPI ---
    // Extract username dari email (akun001@feryshop.com -> akun001)
    const emailUser = recipient_email.split("@")[0];
    const domain = recipient_email.split("@")[1];

    // Panggil cPanel UAPI untuk ganti password
    // Endpoint: https://202.10.40.94:2083/execute/Email/passwd_pop
    const uapiUrl = `https://202.10.40.94:2083/execute/Email/passwd_pop?email=${encodeURIComponent(emailUser)}&password=${encodeURIComponent(new_password)}&domain=${encodeURIComponent(domain)}`;

    const uapiResponse = await fetch(uapiUrl, {
      method: "GET",
      headers: {
        "Authorization": `whm ${CPANEL_USER}:${CPANEL_AUTH}`,
      },
    });

    if (!uapiResponse.ok) {
      const uapiError = await uapiResponse.text();
      console.error("cPanel UAPI error:", uapiError);
      return new Response(
        JSON.stringify({ error: "Failed to update password. Please try again." }),
        { status: 500, headers }
      );
    }

    const uapiResult = await uapiResponse.json();

    if (uapiResult.status !== 1) {
      return new Response(
        JSON.stringify({ error: uapiResult.errors?.[0] || "Password update failed" }),
        { status: 500, headers }
      );
    }

    // --- Update timestamp di mailbox_accounts (opsional) ---
    await supabase
      .from("mailbox_accounts")
      .update({ updated_at: new Date().toISOString() })
      .eq("email", recipient_email);

    // --- Return success (FR-11) ---
    return new Response(
      JSON.stringify({
        success: true,
        message: "Password updated successfully",
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error("Edge Function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers }
    );
  }
});
