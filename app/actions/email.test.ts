import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    serializeError: (e: unknown) => e,
  },
}));

import {
  getMailboxPinStatus,
  isMailboxAuthorized,
  revokeMailboxAccess,
  verifyMailboxAccess,
  archiveMailboxEmail,
  deleteMailboxEmail,
} from "@/app/actions/email";
import { signMailboxAuthToken, verifyMailboxAuthToken } from "@/lib/auth/signed-token";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

function mockSupabase(rows: unknown[] | null, error: unknown = null) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: Array.isArray(rows) ? (rows[0] ?? null) : rows,
      error,
    }),
  };
  (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return chain;
}

describe("verifyMailboxAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const store = { set: vi.fn(), get: vi.fn(), delete: vi.fn() };
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(store);
  });

  it("rejects empty email", async () => {
    const res = await verifyMailboxAccess("", "123456");
    expect(res.success).toBe(false);
    expect(res.message).toContain("Format alamat email");
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("rejects email without @", async () => {
    const res = await verifyMailboxAccess("not-an-email", "123456");
    expect(res.success).toBe(false);
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("rejects empty pin when is_pin_enabled is true", async () => {
    mockSupabase([
      { email: "user@example.com", access_password: "123456", is_active: true, is_password_enabled: true },
    ]);
    const res = await verifyMailboxAccess("user@example.com", "   ");
    expect(res.success).toBe(false);
    expect(res.message).toContain("membutuhkan PIN Akses");
  });

  it("accepts empty pin when is_pin_enabled is false (manual deactivation)", async () => {
    mockSupabase([
      { email: "user@example.com", access_password: "123456", is_active: true, is_password_enabled: false },
    ]);
    const res = await verifyMailboxAccess("user@example.com", "");
    expect(res.success).toBe(true);

    const store = await cookies();
    expect(store.set).toHaveBeenCalledTimes(1);
    const [name, value] = (store.set as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(name).toContain("mailbox_auth_");
    expect(await verifyMailboxAuthToken("user@example.com", value)).toBe(true);
  });

  it("handles supabase error", async () => {
    mockSupabase(null, new Error("db down"));
    const res = await verifyMailboxAccess("user@example.com", "123456");
    expect(res.success).toBe(false);
    expect(res.message).toContain("kesalahan sistem");
  });

  it("rejects when email not found", async () => {
    mockSupabase(null);
    const res = await verifyMailboxAccess("unknown@example.com", "123456");
    expect(res.success).toBe(false);
    expect(res.message).toContain("tidak valid");
  });

  it("rejects wrong pin when pin is enabled", async () => {
    mockSupabase([
      { email: "user@example.com", access_password: "999999", is_active: true, is_password_enabled: true },
    ]);
    const res = await verifyMailboxAccess("user@example.com", "123456");
    expect(res.success).toBe(false);
    expect(res.message).toContain("PIN");
  });

  it("accepts correct pin and sets signed HMAC auth cookie", async () => {
    mockSupabase([
      { email: "user@example.com", access_password: "123456", is_active: true, is_password_enabled: true },
    ]);
    const res = await verifyMailboxAccess("user@example.com", "123456");
    expect(res.success).toBe(true);

    const store = await cookies();
    expect(store.set).toHaveBeenCalledTimes(1);
    const [name, value, options] = (store.set as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(name).toContain("mailbox_auth_");
    expect(await verifyMailboxAuthToken("user@example.com", value)).toBe(true);
    expect(options).toMatchObject({ httpOnly: true, path: "/", sameSite: "lax" });
  });

  it("falls back to default pin 123456 when access_pin missing", async () => {
    mockSupabase([
      { email: "user@example.com", access_password: null, is_active: true, is_password_enabled: true },
    ]);
    const res = await verifyMailboxAccess("user@example.com", "123456");
    expect(res.success).toBe(true);
  });

  it("handles missing supabase client gracefully without throwing", async () => {
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("Supabase configuration missing: supabaseUrl is required");
    });
    const res = await verifyMailboxAccess("user@example.com", "123456");
    expect(res.success).toBe(false);
    expect(res.message).toContain("Konfigurasi server database bermasalah");
  });
});

describe("isMailboxAuthorized - Cookie Forgery Prevention", () => {
  it("rejects forged static 'authorized' cookie", async () => {
    const store = { get: vi.fn().mockReturnValue({ value: "authorized" }) };
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(store);

    const isAuth = await isMailboxAuthorized("victim@feryshop.com");
    expect(isAuth).toBe(false);
  });

  it("rejects cookie with invalid HMAC signature", async () => {
    const store = {
      get: vi
        .fn()
        .mockReturnValue({ value: "eyJlbWFpbCI6InZpY3RpbUBmZXJ5c2hvcC5jb20ifQ.fake-signature" }),
    };
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(store);

    const isAuth = await isMailboxAuthorized("victim@feryshop.com");
    expect(isAuth).toBe(false);
  });
});

describe("getMailboxPinStatus", () => {
  it("returns is_pin_enabled correctly", async () => {
    mockSupabase([{ email: "user@example.com", is_password_enabled: false, is_active: true }]);
    const res = await getMailboxPinStatus("user@example.com");
    expect(res.exists).toBe(true);
    expect(res.is_pin_enabled).toBe(false);
  });

  it("defaults is_pin_enabled to true if not specified", async () => {
    mockSupabase([{ email: "user@example.com", is_password_enabled: null, is_active: true }]);
    const res = await getMailboxPinStatus("user@example.com");
    expect(res.exists).toBe(true);
    expect(res.is_pin_enabled).toBe(true);
  });

  it("handles missing supabase client gracefully without throwing", async () => {
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("Supabase configuration missing: supabaseUrl is required");
    });
    const res = await getMailboxPinStatus("user@example.com");
    expect(res.exists).toBe(false);
    expect(res.is_pin_enabled).toBe(true);
  });
});

describe("revokeMailboxAccess", () => {
  it("deletes specified and remaining mailbox auth cookies", async () => {
    const mockDelete = vi.fn();
    const mockGetAll = vi
      .fn()
      .mockReturnValue([{ name: "mailbox_auth_123" }, { name: "other_cookie" }]);
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      delete: mockDelete,
      getAll: mockGetAll,
    });

    await revokeMailboxAccess("user@example.com");
    expect(mockDelete).toHaveBeenCalledWith(
      `mailbox_auth_${Buffer.from("user@example.com").toString("hex")}`,
    );
    expect(mockDelete).toHaveBeenCalledWith("mailbox_auth_123");
  });
});

describe("archiveMailboxEmail / deleteMailboxEmail", () => {
  const validEmail = "user@example.com";
  const emailId = "11111111-2222-3333-4444-555555555555";

  async function mockAuthorizedSession(
    email: string,
    invokeImpl?: (...args: unknown[]) => unknown,
  ) {
    const token = await signMailboxAuthToken(email);
    const mockInvoke = vi.fn();
    if (invokeImpl) mockInvoke.mockImplementation(invokeImpl as (...a: never[]) => unknown);
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: token }),
      set: vi.fn(),
      delete: vi.fn(),
    });
    (createSupabaseServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
      functions: { invoke: mockInvoke },
    });
    return mockInvoke;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid email without touching supabase", async () => {
    const res = await archiveMailboxEmail("bukan-email", emailId, true);
    expect(res.success).toBe(false);
    expect(res.message).toContain("Format alamat email");
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("rejects missing email id", async () => {
    const res = await deleteMailboxEmail(validEmail, "");
    expect(res.success).toBe(false);
    expect(res.message).toContain("ID email");
  });

  it("rejects when mailbox session is invalid", async () => {
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "forged-token" }),
    });
    const res = await deleteMailboxEmail(validEmail, emailId);
    expect(res.success).toBe(false);
    expect(res.message).toContain("Sesi mailbox");
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("archives email and returns edge success message", async () => {
    const mockInvoke = await mockAuthorizedSession(validEmail, async () => ({
      data: { success: true, message: "Email diarsipkan." },
      error: null,
    }));
    const res = await archiveMailboxEmail(validEmail, emailId, true);
    expect(res.success).toBe(true);
    expect(res.message).toContain("diarsipkan");
    expect(mockInvoke).toHaveBeenCalledWith(
      "mailbox-email-actions",
      expect.objectContaining({
        body: expect.objectContaining({ action: "archive", email_id: emailId }),
      }),
    );
  });

  it("unarchives when archived=false", async () => {
    const mockInvoke = await mockAuthorizedSession(validEmail, async () => ({
      data: { success: true },
      error: null,
    }));
    const res = await archiveMailboxEmail(validEmail, emailId, false);
    expect(res.success).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith(
      "mailbox-email-actions",
      expect.objectContaining({ body: expect.objectContaining({ action: "unarchive" }) }),
    );
  });

  it("deletes email via edge function", async () => {
    const mockInvoke = await mockAuthorizedSession(validEmail, async () => ({
      data: { success: true, message: "Email dihapus." },
      error: null,
    }));
    const res = await deleteMailboxEmail(validEmail, emailId);
    expect(res.success).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith(
      "mailbox-email-actions",
      expect.objectContaining({ body: expect.objectContaining({ action: "delete" }) }),
    );
  });

  it("forwards edge function error message", async () => {
    await mockAuthorizedSession(validEmail, async () => ({
      data: { error: "Email tidak ditemukan." },
      error: null,
    }));
    const res = await deleteMailboxEmail(validEmail, emailId);
    expect(res.success).toBe(false);
    expect(res.message).toContain("tidak ditemukan");
  });
});
