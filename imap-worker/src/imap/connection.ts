import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import * as dotenv from "dotenv";
import { classifyEmail } from "../classification/classifier";
import { insertIncomingEmail } from "../supabase/insert-email";
import { logger } from "../utils/logger";

dotenv.config();

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Batas atas reconnect backoff per PRD Bab 3.6: max 60 detik.
 * Pattern: 1s → 2s → 4s → 8s → 16s → 32s → 60s → 60s → ...
 */
const MAX_RECONNECT_DELAY_MS = 60000;
const BASE_RECONNECT_DELAY_MS = 1000;

export async function connectIMAP() {
  const imapPort = parseInt(process.env.IMAP_PORT || "993", 10);
  let reconnectAttempt = 0;

  while (true) {
    let client: ImapFlow | null = null;
    let lock: any = null;

    try {
      client = new ImapFlow({
        host: process.env.IMAP_HOST || "localhost",
        port: imapPort,
        secure: imapPort === 993,
        tls: {
          rejectUnauthorized: false,
        },
        auth: {
          user: process.env.IMAP_USER || "",
          pass: process.env.IMAP_PASSWORD || "",
        },
        logger: {
          debug: () => {},
          info: (msg: any) => logger.info("IMAP_RAW", msg),
          warn: (msg: any) => logger.warn("IMAP_RAW", msg),
          error: (msg: any) => logger.error("IMAP_RAW", msg),
        },
      });

      // Promise yang resolve saat koneksi putus — untuk break out dari IDLE state
      const connectionLostPromise = new Promise((resolve) => {
        client!.on("close", () => {
          logger.error("IMAP connection CLOSED unexpectedly");
          resolve(true);
        });
        client!.on("error", (err: any) => {
          logger.error("IMAP client error event", { error: err?.message || String(err) });
          resolve(true);
        });
      });

      await client.connect();
      logger.info("IMAP connected successfully", {
        host: process.env.IMAP_HOST || "localhost",
        port: imapPort,
        user: process.env.IMAP_USER || "(not set)",
      });

      // Koneksi berhasil — reset reconnect counter ke 0
      reconnectAttempt = 0;

      // Langsung lock INBOX tanpa client.list() — worker hanya butuh INBOX per PRD Bab 4.1
      lock = await client.getMailboxLock("INBOX");
      logger.info("Mailbox INBOX locked");

      const mailbox = client.mailbox;
      if (mailbox) {
        logger.info("INBOX selected", {
          exists: mailbox.exists,
          uidNext: mailbox.uidNext,
          path: mailbox.path,
        });
      } else {
        logger.error("INBOX selection returned falsy mailbox");
      }

      // Event listener: email baru masuk — fetch, parse, classify, insert ke Supabase
      client.on("exists", async (data: any) => {
        logger.info("IMAP 'exists' event triggered", {
          count: data.count,
          prevCount: data.prevCount,
          path: data.path,
        });

        try {
          const message = await client!.fetchOne(data.count, { source: true, envelope: true });
          if (!message || !message.source) {
            logger.error("Fetched message has no source", { sequence: data.count });
            return;
          }

          logger.info("Email fetched, parsing...", { sequence: data.count });

          const parsed = await simpleParser(message.source);

          const subject = parsed.subject || "";
          const textBody = parsed.text || "";
          const sender = parsed.from?.value[0]?.address || "unknown";
          const toField = Array.isArray(parsed.to) ? parsed.to[0] : parsed.to;
          const recipient = toField?.value[0]?.address || "unknown";
          const messageId = parsed.messageId || String(Date.now());

          logger.info("Email parsed", { subject, sender, recipient, messageId });

          const { category, visibility, otp } = classifyEmail(subject, textBody);

          logger.info("Email classified", { category, visibility, otp });

          await insertIncomingEmail({
            recipient_email: recipient,
            sender_email: sender,
            subject,
            message_id: messageId,
            otp_code: otp,
            raw_body_snippet: textBody,
            category,
            visibility,
          });
        } catch (err: any) {
          logger.error("Error processing incoming email", { error: err.message, stack: err.stack });
        }
      });

      logger.info("IMAP IDLE listener registered, waiting for new emails...");

      // Suspend execution di sini sampai koneksi putus
      await connectionLostPromise;
    } catch (err: any) {
      logger.error("IMAP loop encountered an error", { error: err.message, stack: err.stack });
    } finally {
      if (lock) {
        try {
          lock.release();
        } catch (e: any) {
          logger.error("Error releasing lock", { error: e.message });
        }
      }
      if (client) {
        try {
          client.close();
        } catch (e: any) {}
      }
    }

    // Exponential backoff reconnect per PRD Bab 3.6: 1s → 2s → 4s → ... max 60s
    reconnectAttempt++;
    const reconnectDelay = Math.min(
      BASE_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempt - 1),
      MAX_RECONNECT_DELAY_MS,
    );
    logger.info("Reconnecting with exponential backoff", {
      attempt: reconnectAttempt,
      delayMs: reconnectDelay,
    });
    await delay(reconnectDelay);
  }
}
