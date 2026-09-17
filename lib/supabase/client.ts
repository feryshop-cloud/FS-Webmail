// lib/supabase/client.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    __ENV?: {
      NEXT_PUBLIC_SUPABASE_URL?: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    };
  }
}

let cachedClient: SupabaseClient | null = null;

export function resetSupabaseClientForTesting() {
  cachedClient = null;
}

function getCredentials(): { url: string; key: string } {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

  if (typeof window !== "undefined" && window.__ENV) {
    if (window.__ENV.NEXT_PUBLIC_SUPABASE_URL) {
      url = window.__ENV.NEXT_PUBLIC_SUPABASE_URL;
    }
    if (window.__ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      key = window.__ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
  }

  return { url, key };
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const { url, key } = getCredentials();
  if (url && key) {
    cachedClient = createClient(url, key);
    return cachedClient;
  }

  return null;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      console.error(
        `[Supabase Client] Attempted to access "${String(prop)}" but Supabase client is not configured. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.`,
      );
      return () => {
        throw new Error(
          "Supabase client is not initialized. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        );
      };
    }

    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
