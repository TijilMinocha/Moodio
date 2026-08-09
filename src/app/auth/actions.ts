"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Auth runs as Server Actions rather than client-side supabase-js.
 *
 * Same principle as everywhere else in this app: the browser never talks to
 * Supabase directly. The session cookie is set server-side and is httpOnly,
 * so the access token is never reachable from JavaScript -- which is the
 * difference between an XSS bug leaking a token and not.
 */

export interface AuthResult {
  error?: string;
}

function validate(email: string, password: string): string | null {
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return "Enter a valid email address.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  return null;
}

export async function signIn(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  const invalid = validate(email, password);
  if (invalid) return { error: invalid };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // The user-facing message stays vague on purpose -- saying "no account
    // with that email" would let anyone enumerate registered addresses. The
    // real reason goes to the server log, where only we can see it.
    console.error("signIn failed:", {
      code: error.code,
      status: error.status,
      message: error.message,
    });
    return { error: "Incorrect email or password." };
  }

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/");
}

export async function signUp(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();

  const invalid = validate(email, password);
  if (invalid) return { error: invalid };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || email.split("@")[0] } },
  });

  if (error) return { error: error.message };

  // No session means email confirmation is enabled and Supabase has sent a
  // link -- OR the address was already registered, in which case Supabase
  // silently does nothing rather than confirm the address exists (that would
  // let anyone enumerate registered users). We cannot tell the two apart, so
  // the message must be true in both cases. Saying "we sent you an email"
  // outright is what made the duplicate-signup bug so confusing to debug.
  if (!data.session) {
    return {
      error:
        "If that email isn't already registered, we've sent a confirmation link. " +
        "Already have an account? Log in instead.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
