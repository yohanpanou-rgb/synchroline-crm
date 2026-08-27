"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, VIEW_ROLE_COOKIE } from "@/lib/supabase/profile";
import { formatDoctorName } from "@/lib/utils/name-normalization";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Lets a manager/admin preview the app as a rep would see it (Header toggle). */
export async function setViewRole(role: "manager" | "rep") {
  const profile = await requireProfile();
  const cookieStore = await cookies();

  if (role === "rep" && profile.realRole !== "rep") {
    cookieStore.set(VIEW_ROLE_COOKIE, "rep", { path: "/", httpOnly: true, sameSite: "lax" });
  } else {
    cookieStore.delete(VIEW_ROLE_COOKIE);
  }

  revalidatePath("/", "layout");
}

export interface GlobalSearchResult {
  id: string;
  label: string;
  sublabel: string | null;
  href: string;
  kind: "doctor" | "pharmacy" | "institution";
}

/** Ενιαία αναζήτηση header (#3) — γιατροί, φαρμακεία, νοσοκομεία μαζί. */
export async function globalSearch(query: string): Promise<GlobalSearchResult[]> {
  await requireProfile();
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = await createClient();
  const [{ data: doctors }, { data: pharmacies }, { data: institutions }] = await Promise.all([
    supabase
      .from("doctors")
      .select("id, last_name, first_name, region, county")
      .or(`last_name.ilike.%${q}%,first_name.ilike.%${q}%`)
      .eq("status", "active")
      .limit(6),
    supabase.from("pharmacies").select("id, name, city").ilike("name", `%${q}%`).limit(4),
    supabase.from("institutions").select("id, name").ilike("name", `%${q}%`).limit(4),
  ]);

  const results: GlobalSearchResult[] = [];
  for (const d of doctors ?? []) {
    results.push({
      id: d.id,
      label: formatDoctorName(d.last_name, d.first_name),
      sublabel: [d.county, d.region].filter(Boolean).join(" · ") || null,
      href: `/doctors/${d.id}`,
      kind: "doctor",
    });
  }
  for (const p of pharmacies ?? []) {
    results.push({
      id: p.id,
      label: p.name,
      sublabel: p.city,
      href: `/pharmacies/${p.id}/edit`,
      kind: "pharmacy",
    });
  }
  for (const i of institutions ?? []) {
    results.push({
      id: i.id,
      label: i.name,
      sublabel: "Νοσοκομείο",
      href: `/hospitals`,
      kind: "institution",
    });
  }
  return results;
}
