import { createClient } from "@supabase/supabase-js";

export function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      `Supabase configuration missing: ${!supabaseUrl ? "supabaseUrl" : "supabaseAnonKey"} is required. Check NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables.`,
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}
