"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isLoginLocked,
  recordFailedLogin,
  clearLoginAttempts,
} from "@/lib/auth/rate-limit";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Συμπλήρωσε email και κωδικό.")}`);
  }

  if (await isLoginLocked(email)) {
    redirect(
      `/login?error=${encodeURIComponent(
        "Πολλές αποτυχημένες προσπάθειες. Δοκίμασε ξανά σε 15 λεπτά.",
      )}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await recordFailedLogin(email);
    redirect(`/login?error=${encodeURIComponent("Λάθος email ή κωδικός.")}`);
  }

  await clearLoginAttempts(email);
  redirect(next || "/dashboard");
}
