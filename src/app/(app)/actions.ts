"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, VIEW_ROLE_COOKIE } from "@/lib/supabase/profile";

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
