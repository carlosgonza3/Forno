import { createClient } from "@supabase/supabase-js";
import { environment } from "../config/env";

export const supabase = environment
  ? createClient(
      environment.VITE_SUPABASE_URL,
      environment.VITE_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      },
    )
  : null;
