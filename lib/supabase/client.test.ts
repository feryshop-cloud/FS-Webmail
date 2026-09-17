import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseClient, resetSupabaseClientForTesting, supabase } from "./client";

describe("lib/supabase/client", () => {
  const originalEnv = { ...process.env };
  const originalWindow = (globalThis as unknown as { window?: unknown }).window;

  beforeEach(() => {
    resetSupabaseClientForTesting();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    if (typeof (globalThis as unknown as { window?: unknown }).window !== "undefined") {
      delete (globalThis as unknown as { window?: { __ENV?: unknown } }).window?.__ENV;
    }
  });

  afterEach(() => {
    resetSupabaseClientForTesting();
    process.env = { ...originalEnv };
    if (originalWindow !== undefined) {
      (globalThis as unknown as { window: unknown }).window = originalWindow;
    } else {
      delete (globalThis as unknown as { window?: unknown }).window;
    }
  });

  it("throws descriptive error when accessed without configuration", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(getSupabaseClient()).toBeNull();
    expect(() => supabase.channel("test")).toThrow(
      "Supabase client is not initialized. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Supabase Client] Attempted to access "channel"'),
    );

    consoleSpy.mockRestore();
  });

  it("initializes client via window.__ENV runtime injection", () => {
    // Simulate runtime injection from layout.tsx in browser
    (
      globalThis as unknown as {
        window: {
          __ENV: { NEXT_PUBLIC_SUPABASE_URL: string; NEXT_PUBLIC_SUPABASE_ANON_KEY: string };
        };
      }
    ).window = {
      __ENV: {
        NEXT_PUBLIC_SUPABASE_URL: "https://test-ref.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      },
    };

    const client = getSupabaseClient();
    expect(client).not.toBeNull();

    // Verify proxy forwards calls to client
    const channel = supabase.channel("test-channel");
    expect(channel).toBeDefined();
    expect(channel.topic).toBe("realtime:test-channel");
  });

  it("initializes client via process.env fallback", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://env-ref.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "env-anon-key";

    const client = getSupabaseClient();
    expect(client).not.toBeNull();

    const channel = supabase.channel("env-channel");
    expect(channel).toBeDefined();
  });
});
