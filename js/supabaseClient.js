import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://kwcoinzhbaijdixlnqzj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ppVpbJ1QB10B3BqobQvFjA_SAMI91Pp";

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR_PROJECT_REF") &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function requireSupabaseConfig() {
  if (isSupabaseConfigured && supabase) return supabase;
  throw new Error(
    "Chua cau hinh Supabase. Hay cap nhat SUPABASE_URL va SUPABASE_ANON_KEY trong js/supabaseClient.js.",
  );
}
