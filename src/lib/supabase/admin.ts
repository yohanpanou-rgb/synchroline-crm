import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

/**
 * Service-role client that bypasses RLS. Server-only, never import from a
 * client component. Used where there is no logged-in user session to scope
 * the request to (e.g. the weekly report cron job) — everywhere else the
 * per-request client in ./server.ts (RLS-scoped to the signed-in user) is
 * the right choice.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
