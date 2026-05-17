import { createClient, type Provider } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient<Database>(
  supabaseUrl || "https://example.supabase.co",
  supabaseAnonKey || "missing-anon-key",
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  },
);

export function requireSupabaseConfig() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase 尚未配置，请设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY");
  }
}

export const oauthProviders = (import.meta.env.VITE_SUPABASE_OAUTH_PROVIDERS ?? "google,github")
  .split(",")
  .map((provider: string) => provider.trim())
  .filter(Boolean) as Provider[];
