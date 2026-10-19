import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { connectIMAP } from "./connection";
import { logger } from "../utils/logger";
import { insertIncomingEmail } from "../supabase/insert-email";

const { instances, simpleParserMock, state } = vi.hoisted(() => ({
  instances: [] as any[],
  simpleParserMock: vi.fn(),
  state: {
    mailbox: { exists: 5, uidNext: 10, path: "INBOX" } as any,
    failNextConnect: 0,
  },
}));

vi.mock("dotenv", () => ({ config: vi.fn() }));
vi.mock("mailparser", () => ({ simpleParser: simpleParserMock }));
vi.mock("../classification/classifier", () => ({
  classifyEmail: vi.fn(() => ({ category: "login_otp", visibility: "buyer", otp: "123456" })),
}));
vi.mock("../supabase/insert-email", () => ({ insertIncomingEmail: vi.fn() }));
vi.mock("../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("imapflow", () => {
  class FakeClient {
    listeners: Record<string, (data?: any) => void> = {};
    connect = vi.fn(async () => {
      if (state.failNextConnect > 0) {
        state.failNextConnect--;
        throw new Error("auth failed");
      }
    });
    getMailboxLock = vi.fn(async () => ({ release: vi.fn() }));
    fetchOne = vi.fn(async () => ({ source: Buffer.from("raw"), envelope: {} }));
    mailbox: any = state.mailbox;
    close = vi.fn(async () => {});
    constructor() {
      instances.push(this);
    }
    on(ev: string, cb: (data?: any) => void) {
      this.listeners[ev] = cb;
    }
    _emit(ev: string, data?: any) {
      this.listeners[ev]?.(data);
    }
  }
  return { ImapFlow: FakeClient };
});

describe("connectIMAP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    instances.length = 0;
    state.mailbox = { exists: 5, uidNext: 10, path: "INBOX" };
    state.failNextConnect = 0;
    vi.mocked(insertIncomingEmail).mockResolvedValue(undefined);
    simpleParserMock.mockResolvedValue({
      subject: "Your code",
      text: "Your verification code is 123456",
      html: "",
      from: { value: [{ address: "shop@x.com" }] },
      to: [{ value: [{ address: "buyer@x.com" }] }],
      messageId: "mid-1",
    });
    process.env.IMAP_HOST = "imap.test.com";
    process.env.IMAP_PORT = "993";
    process.env.IMAP_USER = "user";
    process.env.IMAP_PASSWORD = "pass";
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function ensureClient() {
    await vi.waitFor(() => expect(instances.length).toBeGreaterThan(0));
    return instances[0];
  }

  it("connects, locks INBOX, registers exists listener, reconnects after close", async () => {
    void connectIMAP();
    const client = await ensureClient();
    expect(client.connect).toHaveBeenCalled();
    await vi.waitFor(() => expect(client.getMailboxLock).toHaveBeenCalledWith("INBOX"));
    await vi.waitFor(() => expect(client.listeners["exists"]).toBeDefined());

    client._emit("close");
    await vi.advanceTimersByTimeAsync(1100);
    await vi.waitFor(() => expect(instances.length).toBeGreaterThanOrEqual(2));
    expect(logger.info).toHaveBeenCalledWith(
      "Reconnecting with exponential backoff",
      expect.objectContaining({ attempt: 1, delayMs: 1000 }),
    );
  });

  it("processes new email on 'exists' event end-to-end", async () => {
    void connectIMAP();
    const client = await ensureClient();
    await vi.waitFor(() => expect(client.listeners["exists"]).toBeDefined());

    client._emit("exists", { count: 6, prevCount: 5, path: "INBOX" });
    await vi.waitFor(() =>
      expect(client.fetchOne).toHaveBeenCalledWith(6, { source: true, envelope: true }),
    );
    await vi.waitFor(() => expect(insertIncomingEmail).toHaveBeenCalledTimes(1));
    expect(insertIncomingEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient_email: "buyer@x.com",
        sender_email: "shop@x.com",
        message_id: "mid-1",
        otp_code: "123456",
        category: "login_otp",
        visibility: "buyer",
      }),
    );
    client._emit("close");
  });

  it("logs error when fetched message has no source", async () => {
    void connectIMAP();
    const client = await ensureClient();
    await vi.waitFor(() => expect(client.listeners["exists"]).toBeDefined());
    client.fetchOne.mockResolvedValueOnce({ source: null });
    client._emit("exists", { count: 6 });
    await vi.waitFor(() =>
      expect(logger.error).toHaveBeenCalledWith("Fetched message has no source", expect.anything()),
    );
    client._emit("close");
  });

  it("logs processing error from exists handler without crashing", async () => {
    void connectIMAP();
    const client = await ensureClient();
    await vi.waitFor(() => expect(client.listeners["exists"]).toBeDefined());
    vi.mocked(insertIncomingEmail).mockRejectedValueOnce(new Error("insert failed"));
    client._emit("exists", { count: 7 });
    await vi.waitFor(() =>
      expect(logger.error).toHaveBeenCalledWith(
        "Error processing incoming email",
        expect.anything(),
      ),
    );
    client._emit("close");
  });

  it("handles connect failure: logs loop error and reconnects", async () => {
    void connectIMAP();
    const client = await ensureClient();
    // Iterasi kedua akan gagal saat connect
    state.failNextConnect = 1;
    client._emit("close");
    await vi.advanceTimersByTimeAsync(1100);
    await vi.waitFor(() =>
      expect(logger.error).toHaveBeenCalledWith(
        "IMAP loop encountered an error",
        expect.objectContaining({ err: expect.any(Error) }),
      ),
    );
    expect(logger.info).toHaveBeenCalledWith(
      "Reconnecting with exponential backoff",
      expect.objectContaining({ attempt: 2, delayMs: 2000 }),
    );
  });

  it("logs when INBOX selection returned falsy mailbox", async () => {
    state.mailbox = null;
    void connectIMAP();
    await vi.waitFor(() =>
      expect(logger.error).toHaveBeenCalledWith("INBOX selection returned falsy mailbox"),
    );
  });
});
