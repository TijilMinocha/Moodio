"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { AuthResult } from "@/app/auth/actions";

const field =
  "mt-1.5 w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm outline-none transition placeholder:text-ink-dim focus:border-brand";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-brand py-3 text-sm font-bold text-white transition hover:bg-brand-hover disabled:opacity-60"
    >
      {pending ? "Please wait..." : label}
    </button>
  );
}

export function AuthForm({
  mode,
  action,
  next,
}: {
  mode: "login" | "signup";
  action: (prev: AuthResult, formData: FormData) => Promise<AuthResult>;
  next?: string;
}) {
  const [state, formAction] = useActionState<AuthResult, FormData>(action, {});
  const isSignup = mode === "signup";

  return (
    <>
      <h2 className="text-2xl font-semibold tracking-tight">
        {isSignup ? "Create account" : "Log in"}
      </h2>
      <p className="mt-1.5 text-sm text-ink-muted">
        {isSignup ? "Free, takes a minute." : "Welcome back."}
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        {next && <input type="hidden" name="next" value={next} />}

        {isSignup && (
          <label className="block">
            <span className="text-xs font-medium text-ink-muted">Display name</span>
            <input name="displayName" type="text" autoComplete="nickname" className={field} />
          </label>
        )}

        <label className="block">
          <span className="text-xs font-medium text-ink-muted">Email</span>
          <input name="email" type="email" required autoComplete="email" className={field} />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-ink-muted">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isSignup ? "new-password" : "current-password"}
            className={field}
          />
          {isSignup && (
            <span className="mt-1.5 block text-xs text-ink-dim">
              At least 8 characters.
            </span>
          )}
        </label>

        {state.error && (
          <p
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm leading-relaxed text-danger"
          >
            {state.error}
          </p>
        )}

        <SubmitButton label={isSignup ? "Sign up" : "Log in"} />
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        {isSignup ? "Already have an account? " : "New to Moodio? "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-medium text-brand hover:underline"
        >
          {isSignup ? "Log in" : "Sign up"}
        </Link>
      </p>
    </>
  );
}
