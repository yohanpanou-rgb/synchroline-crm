import { createAdminClient } from "@/lib/supabase/admin";

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

/**
 * Fail-open by design: any error talking to login_rate_limits (missing env
 * var, network blip, table not migrated yet) must never block a legitimate
 * login. Every function here swallows its own errors and falls back to "not
 * locked out" / "no-op" rather than throwing.
 */
export async function isLoginLocked(identifier: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
    const { count, error } = await supabase
      .from("login_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("identifier", identifier)
      .gte("attempted_at", since);
    if (error) return false;
    return (count ?? 0) >= MAX_ATTEMPTS;
  } catch {
    return false;
  }
}

export async function recordFailedLogin(identifier: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("login_rate_limits").insert({ identifier });
  } catch {
    // fail open — a logging failure must not surface to the user
  }
}

export async function clearLoginAttempts(identifier: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("login_rate_limits").delete().eq("identifier", identifier);
  } catch {
    // fail open
  }
}
