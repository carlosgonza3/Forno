import { z } from "zod";

const environmentSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().startsWith("https://"),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

const result = environmentSchema.safeParse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
});

export const environment = result.success ? result.data : null;
export const environmentIssues = result.success
  ? []
  : result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

export const isSupabaseConfigured = Boolean(environment);
