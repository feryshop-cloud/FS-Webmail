import * as dotenv from "dotenv";
dotenv.config();

import { connectIMAP } from "./imap/connection";
import { startHeartbeat } from "./supabase/heartbeat";
import { logger } from "./utils/logger";

async function main() {
  logger.info("imap-worker starting", {
    workerName: process.env.WORKER_NAME || "imap-worker-main",
    imapHost: process.env.IMAP_HOST || "localhost",
    imapPort: process.env.IMAP_PORT || "993",
  });

  try {
    // Start heartbeat reporting to Supabase
    await startHeartbeat();
    logger.info("Heartbeat started");

    // Connect to IMAP and begin listening for new emails
    await connectIMAP();
    logger.info("IMAP connection established, worker is running");
  } catch (err: any) {
    logger.error("Fatal error during worker startup", { err });
    process.exit(1);
  }
}

// Graceful shutdown handlers
process.on("SIGINT", () => {
  logger.info("Received SIGINT, shutting down gracefully");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { err });
  process.exit(1);
});

process.on("unhandledRejection", (reason: any) => {
  logger.error("Unhandled rejection", {
    err: reason instanceof Error ? reason : new Error(String(reason)),
  });
  process.exit(1);
});

main();
