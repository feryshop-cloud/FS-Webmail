// lib/supabase/client.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

export const supabase: SupabaseClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (new Proxy(
        {},
        {
          get(_target, prop) {
            console.error(
              `[Supabase Client] Attempted to access "${String(prop)}" but Supabase client is not configured. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.`,
            );
            return () => {
              throw new Error(
                "Supabase client is not initialized. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
              );
            };
          },
        },
      ) as unknown as SupabaseClient);
