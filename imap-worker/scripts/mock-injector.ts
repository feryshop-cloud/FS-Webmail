/**
 * Mock Injector — skrip testing SAJA, bukan bagian kode produksi worker.
 * Tujuan: Inject email ke INBOX via IMAP APPEND untuk menguji pipeline classifier → Supabase.
 * Email ini harus diproses oleh classifier sebagai login_otp + buyer secara NATURAL
 * karena subject dan body memenuhi pattern 'login_otp' di PRD Bab 6.
 */
import { ImapFlow } from 'imapflow';
import * as dotenv from 'dotenv';

dotenv.config();

async function injectMockEmail() {
  const host = process.env.IMAP_HOST || 'localhost';
  const port = parseInt(process.env.IMAP_PORT || '993', 10);
  const user = process.env.IMAP_USER || '';
  const pass = process.env.IMAP_PASSWORD || '';

  // Penerima bisa dioper lewat argumen supaya bisa menguji alamat catch-all mana pun
  // (semua tetap mendarat di INBOX master, persis seperti email asli dari platform game).
  const recipient = process.argv[2] || user;
  const otp = process.argv[3] || '889922';

  const messageId = `<mock-${Date.now()}@moonton.com>`;
  const subject = 'login code verification';
  const bodyText = `Your login code is ${otp}. Do not share this with anyone.`;

  // Construct raw RFC 2822 email
  const rawEmail = [
    `From: noreply@moonton.com`,
    `To: ${recipient}`,
    `Subject: ${subject}`,
    `Message-ID: ${messageId}`,
    `Date: ${new Date().toUTCString()}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    bodyText
  ].join('\r\n');

  const client = new ImapFlow({
    host,
    port,
    secure: port === 993,
    tls: { rejectUnauthorized: false },
    auth: { user, pass },
    logger: false
  });

  try {
    await client.connect();
    console.log('Connected to IMAP server');

    await client.append('INBOX', rawEmail, ['\\Seen']);
    console.log('Mock email appended to INBOX successfully');
    console.log('--- Expected Results ---');
    console.log(`Subject:    ${subject}`);
    console.log(`Message-ID: ${messageId}`);
    console.log(`Recipient:  ${recipient}`);
    console.log(`OTP:        ${otp}`);
    console.log(`Category:   login_otp`);
    console.log(`Visibility: buyer`);
  } catch (err: any) {
    console.error('Mock injector failed:', err.message);
    process.exit(1);
  } finally {
    await client.logout();
  }
}

injectMockEmail();
