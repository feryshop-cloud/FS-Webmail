import { describe, expect, it, vi, beforeEach } from "vitest";
import { insertIncomingEmail } from "./insert-email";
import { supabase } from "./client";
import { logger } from "../utils/logger";

const { insertMock } = vi.hoisted(() => ({
  insertMock: vi.fn(),
}));

vi.mock("./client", () => ({
  supabase: {
    from: vi.fn(() => ({ insert: insertMock })),
  },
}));

vi.mock("../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const baseData = {
  recipient_email: "buyer@x.com",
  sender_email: "shop@x.com",
  subject: "Your OTP",
  message_id: "m-1",
  otp_code: "123456",
  raw_body_snippet: "hi",
  category: "login_otp",
  visibility: "buyer",
};

describe("insertIncomingEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertMock.mockReturnValue({ error: null });
  });

  it("inserts into incoming_emails and logs success", async () => {
    await insertIncomingEmail(baseData);
    expect(supabase.from).toHaveBeenCalledWith("incoming_emails");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient_email: "buyer@x.com",
        otp_code: "123456",
        category: "login_otp",
        visibility: "buyer",
        received_at: expect.any(String),
      }),
    );
    expect(logger.info).toHaveBeenCalledWith("Email inserted successfully", {
      message_id: "m-1",
      recipient_email: "buyer@x.com",
    });
  });

  it("uses empty snippet when raw_body_snippet missing", async () => {
    const { raw_body_snippet, ...rest } = baseData;
    await insertIncomingEmail(rest as any);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ raw_body_snippet: "" }));
  });

  it("ignores duplicate key error", async () => {
    insertMock.mockReturnValue({ error: { code: "23505" } });
    await insertIncomingEmail(baseData);
    expect(logger.info).toHaveBeenCalledWith("Duplicate ignored", {
      message_id: "m-1",
      recipient_email: "buyer@x.com",
    });
  });

  it("ignores duplicate by message match", async () => {
    insertMock.mockReturnValue({
      error: { message: "conflict: uniq_recipient_message" },
    });
    await insertIncomingEmail(baseData);
    expect(logger.info).toHaveBeenCalledWith("Duplicate ignored", expect.anything());
  });

  it("logs+rethrows non-duplicate error", async () => {
    const err = { code: "500", message: "db down" };
    insertMock.mockReturnValue({ error: err });
    await expect(insertIncomingEmail(baseData)).rejects.toEqual(err);
    expect(logger.error).toHaveBeenCalled();
  });
});
