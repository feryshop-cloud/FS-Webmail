// Supabase Edge Function: change-mailbox-password
//
// Tugas:
// 1. Validasi payload
// 2. Cocokkan old_pin dengan access_pin di email_accounts (bukti kepemilikan mailbox)
// 3. Rate limiting: max 5x/jam per email
// 4. Jika cocok -> update password via cPanel UAPI dengan new_pin
// 5. Update access_pin di email_accounts
// 6. Return success atau error

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
    .from("rate_limit_attempts")
    .select("id, attempt_count")
    .eq("email", email)
    .gte("window_start", oneHourAgo)
    .order("window_start", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    // Error selain Not Found
    console.error("Rate limit query error:", error);
    return false;
  }

  if (data) {
    if (data.attempt_count >= 5) {
      return false; // Terlalu banyak percobaan
    }
    // Update attempt count
    await supabase
      .from("rate_limit_attempts")
      .update({ attempt_count: data.attempt_count + 1 })
      .eq("id", data.id);
    return true;
  } else {
    // Belum ada percobaan dalam 1 jam terakhir, buat baru
    await supabase.from("rate_limit_attempts").insert([{ email: email, attempt_count: 1 }]);
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
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  try {
    const body = await req.json();
    const { recipient_email, old_pin, new_pin } = body;

    // --- Validasi payload ---
    if (!recipient_email || !old_pin || !new_pin) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers,
      });
    }

    // Validasi format email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(recipient_email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers,
      });
    }

    // Validasi PIN lama & baru: 6 digit numerik
    const pinRegex = /^\d{6}$/;
    if (!pinRegex.test(old_pin) || !pinRegex.test(new_pin)) {
      return new Response(JSON.stringify({ error: "PIN must be 6 digits" }), {
        status: 400,
        headers,
      });
    }

    // --- Inisialisasi Supabase client dengan service role key ---
    const supabase = createClient(SB_URL, SB_SERVICE_ROLE_KEY);

    // --- Verifikasi PIN lama (bukti kepemilikan mailbox) ---
    const { data: account, error: accError } = await supabase
      .from("email_accounts")
      .select("email, access_pin, is_active")
      .eq("email", recipient_email)
      .eq("is_active", true)
      .maybeSingle();

    if (accError || !account) {
      console.error("Email account verification failed:", accError);
      return new Response(JSON.stringify({ error: "Email account not found or inactive" }), {
        status: 403,
        headers,
      });
    }

    const expectedPin = account.access_pin || "123456";
    if (old_pin !== expectedPin) {
      return new Response(JSON.stringify({ error: "Old PIN does not match" }), {
        status: 403,
        headers,
      });
    }

    // --- Rate limiting SQL ---
    if (!(await checkRateLimitSQL(recipient_email, supabase))) {
      return new Response(JSON.stringify({ error: "Too many attempts. Try again in 1 hour." }), {
        status: 429,
        headers,
      });
    }

    // --- Update password via cPanel UAPI ---
    // Extract username dari email (akun001@feryshop.com -> akun001)
    const emailUser = recipient_email.split("@")[0];
    const domain = recipient_email.split("@")[1];

    // Panggil cPanel UAPI untuk ganti password (menggunakan POST untuk keamanan)
    const uapiUrl = `https://202.10.40.94:2083/execute/Email/passwd_pop`;
    const formData = new URLSearchParams();
    formData.append("email", emailUser);
    formData.append("password", new_pin);
    formData.append("domain", domain);

    const uapiResponse = await fetch(uapiUrl, {
      method: "POST",
      headers: {
        Authorization: `whm ${CPANEL_USER}:${CPANEL_AUTH}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!uapiResponse.ok) {
      const uapiError = await uapiResponse.text();
      console.error("cPanel UAPI error:", uapiError);
      return new Response(
        JSON.stringify({ error: "Failed to update password. Please try again." }),
        { status: 500, headers },
      );
    }

    const uapiResult = await uapiResponse.json();

    if (uapiResult.status !== 1) {
      return new Response(
        JSON.stringify({ error: uapiResult.errors?.[0] || "Password update failed" }),
        { status: 500, headers },
      );
    }

    // --- Update access_pin di email_accounts agar verifikasi berikutnya konsisten ---
    await supabase
      .from("email_accounts")
      .update({ access_pin: new_pin, updated_at: new Date().toISOString() })
      .eq("email", recipient_email);

    // --- Return success ---
    return new Response(
      JSON.stringify({
        success: true,
        message: "PIN updated successfully",
      }),
      { status: 200, headers },
    );
  } catch (error) {
    console.error("Edge Function error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers,
    });
  }
});
