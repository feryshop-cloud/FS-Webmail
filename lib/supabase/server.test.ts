import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./server";

vi.mock("@supabase/supabase-js");

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("createSupabaseServerClient", () => {
  it("throws error when NEXT_PUBLIC_SUPABASE_URL missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
    expect(createSupabaseServerClient).toThrow("supabaseUrl is required");
  });

  it("throws error when NEXT_PUBLIC_SUPABASE_ANON_KEY missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    expect(createSupabaseServerClient).toThrow("supabaseAnonKey is required");
  });

  it("creates client with NEXT_PUBLIC env vars", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    createSupabaseServerClient();
    expect(createClient).toHaveBeenCalledWith("https://test.supabase.co", "anon-key");
  });

  it("falls back to SUPABASE env vars when NEXT_PUBLIC missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.SUPABASE_URL = "https://fallback.supabase.co";
    process.env.SUPABASE_ANON_KEY = "fallback-key";
    createSupabaseServerClient();
    expect(createClient).toHaveBeenCalledWith("https://fallback.supabase.co", "fallback-key");
  });
});
