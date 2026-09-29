// Supabase Edge Function: mailbox-email-actions
//
// Tugas: arsip/buka-arsip/hapus satu email milik mailbox pembeli.
// Otorisasi: token HMAC mailbox (sama yang dipakai cookie mailbox_auth_* di
// WebMail, ditandatangani SESSION_SECRET). Service role key hanya hidup di sini.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SB_URL") || "";
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY") || "";
// Harus sama dengan secret penanda cookie di WebMail (lib/auth/signed-token.ts).
// Opsional dikeraskan via Edge Secret MAILBOX_AUTH_SECRET.
const MAILBOX_AUTH_SECRET =
  Deno.env.get("MAILBOX_AUTH_SECRET") ||
  Deno.env.get("SESSION_SECRET") ||
  "feryshop-webmail-auth-secure-hmac-secret-v1";

function base64UrlToBytes(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function verifyMailboxToken(email: string, token: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadEncoded, signatureEncoded] = parts;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(MAILBOX_AUTH_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(signatureEncoded),
      new TextEncoder().encode(payloadEncoded),
    );
    if (!valid) return false;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadEncoded))) as {
      email: string;
      exp: number;
    };
    if (payload.email.toLowerCase() !== email.trim().toLowerCase()) return false;
    if (Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
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
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

  try {
    const body = await req.json();
    const { recipient_email, email_id, action, mailbox_token } = body as {
      recipient_email?: string;
      email_id?: string;
      action?: string;
      mailbox_token?: string;
    };

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!recipient_email || !emailRegex.test(recipient_email)) {
      return new Response(JSON.stringify({ error: "Format alamat email tidak valid." }), {
        status: 400,
        headers,
      });
    }
    if (!email_id || typeof email_id !== "string") {
      return new Response(JSON.stringify({ error: "email_id wajib diisi." }), {
        status: 400,
        headers,
      });
    }
    if (!["archive", "unarchive", "delete"].includes(action || "")) {
      return new Response(
        JSON.stringify({ error: "Aksi tidak dikenal. Gunakan archive/unarchive/delete." }),
        { status: 400, headers },
      );
    }

    // Bukti kepemilikan mailbox: token HMAC sesi PIN yang masih berlaku.
    if (!mailbox_token || !(await verifyMailboxToken(recipient_email, mailbox_token))) {
      return new Response(
        JSON.stringify({ error: "Sesi mailbox tidak valid. Silakan buka ulang inbox." }),
        { status: 403, headers },
      );
    }

    if (!SB_URL || !SB_SERVICE_ROLE_KEY) {
      console.error("Missing SB_URL / SB_SERVICE_ROLE_KEY secrets");
      return new Response(JSON.stringify({ error: "Konfigurasi server belum lengkap." }), {
        status: 500,
        headers,
      });
    }

    const supabase = createClient(SB_URL, SB_SERVICE_ROLE_KEY);
    const cleanEmail = recipient_email.trim().toLowerCase();

    // Scope ketat: hanya baris milik mailbox ini yang visible untuk pembeli.
    const scope = (q: any) =>
      q.eq("id", email_id).eq("recipient_email", cleanEmail).eq("visibility", "buyer");

    if (action === "delete") {
      const { data, error } = await scope(supabase.from("incoming_emails").delete().select("id"));
      if (error) {
        console.error("Delete email error:", error);
        return new Response(JSON.stringify({ error: "Gagal menghapus email." }), {
          status: 500,
          headers,
        });
      }
      if (!data || data.length === 0) {
        return new Response(JSON.stringify({ error: "Email tidak ditemukan." }), {
          status: 404,
          headers,
        });
      }
      return new Response(JSON.stringify({ success: true, message: "Email dihapus." }), {
        status: 200,
        headers,
      });
    }

    const { data, error } = await scope(
      supabase
        .from("incoming_emails")
        .update({ is_archived: action === "archive" })
        .select("id"),
    );
    if (error) {
      console.error("Archive email error:", error);
      return new Response(JSON.stringify({ error: "Gagal mengarsipkan email." }), {
        status: 500,
        headers,
      });
    }
    if (!data || data.length === 0) {
      return new Response(JSON.stringify({ error: "Email tidak ditemukan." }), {
        status: 404,
        headers,
      });
    }
    return new Response(
      JSON.stringify({
        success: true,
        message: action === "archive" ? "Email diarsipkan." : "Email dikeluarkan dari arsip.",
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
