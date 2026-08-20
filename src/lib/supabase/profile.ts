import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database, UserRole } from "@/lib/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileWithViewRole = Profile & { realRole: UserRole };

export const VIEW_ROLE_COOKIE = "view_role";

/**
 * Server-side helper: current authenticated user's profile row, or redirect
 * to /login. Managers/admins may switch their effective `role` to "rep" via
 * the view_role cookie (Header toggle) to preview the app as a rep would see
 * it — `realRole` always carries the true DB role for UI that needs it.
 */
export async function requireProfile(): Promise<ProfileWithViewRole> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/login");
  }

  const isManager = profile.role === "manager" || profile.role === "admin";
  const cookieStore = await cookies();
  const viewRole = cookieStore.get(VIEW_ROLE_COOKIE)?.value;
  const effectiveRole: UserRole = isManager && viewRole === "rep" ? "rep" : profile.role;

  return { ...profile, role: effectiveRole, realRole: profile.role };
}

export function isManagerOrAdmin(role: Profile["role"]) {
  return role === "manager" || role === "admin";
}
