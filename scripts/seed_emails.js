const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Simple .env parser without external dependencies
function loadEnv(envPath) {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value;
      }
    });
  }
}

// Try loading from .env.local or imap-worker/.env
loadEnv(path.join(__dirname, "../.env.local"));
loadEnv(path.join(__dirname, "../imap-worker/.env"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANON_KEY) must be set in .env.local or imap-worker/.env",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Seeding dummy emails into incoming_emails table...");

  const dummyEmails = [
    {
      recipient_email: "test@feryshop.com",
      sender_email: "noreply@moonton.com",
      subject: "Mobile Legends Verification Code",
      message_id: "msg-001-moonton",
      otp_code: "849201",
      raw_body_snippet:
        "Kode verifikasi Anda adalah 849201. Jangan berikan kode ini kepada siapapun.",
      category: "otp",
      visibility: "buyer",
      received_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      recipient_email: "test@feryshop.com",
      sender_email: "security@riotgames.com",
      subject: "Valorant Login Verification",
      message_id: "msg-002-valorant",
      otp_code: "930128",
      raw_body_snippet: "Use verification code 930128 to log into your Valorant account.",
      category: "otp",
      visibility: "buyer",
      received_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
    {
      recipient_email: "test@feryshop.com",
      sender_email: "account-security-noreply@account.garena.com",
      subject: "Garena Authenticator Code",
      message_id: "msg-003-garena",
      otp_code: "152433",
      raw_body_snippet: "Kode keamanan Garena Anda adalah 152433.",
      category: "otp",
      visibility: "buyer",
      received_at: new Date().toISOString(),
    },
    {
      recipient_email: "test@feryshop.com",
      sender_email: "billing@hetzner.com",
      subject: "Invoice #904124 Payment Receipt",
      message_id: "msg-004-hetzner",
      otp_code: null,
      raw_body_snippet: "Dear Admin, payment for invoice #904124 has been processed successfully.",
      category: "billing",
      visibility: "admin_only",
      received_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
  ];

  for (const email of dummyEmails) {
    const { error } = await supabase
      .from("incoming_emails")
      .upsert(email, { onConflict: "recipient_email,message_id" });
    if (error) {
      console.error(`Failed to insert ${email.message_id}:`, error.message);
    } else {
      console.log(`[SUCCESS] Inserted: ${email.subject} (${email.visibility})`);
    }
  }

  console.log("Seeding completed successfully!");
}

seed();
