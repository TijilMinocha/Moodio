"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { AuthResult } from "@/app/auth/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-green-500 py-3 font-bold text-black transition hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
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
    <div className="mx-auto mt-16 w-full max-w-sm rounded-lg bg-[#121212] p-8">
      <h1 className="text-2xl font-bold">
        {isSignup ? "Create your account" : "Log in to Moodio"}
      </h1>

      <form action={formAction} className="mt-6 space-y-4">
        {next && <input type="hidden" name="next" value={next} />}

        {isSignup && (
          <label className="block">
            <span className="text-sm text-white/70">Display name</span>
            <input
              name="displayName"
              type="text"
              autoComplete="nickname"
              className="mt-1 w-full rounded border border-white/20 bg-black px-3 py-2 outline-none focus:border-green-500"
            />
          </label>
        )}

        <label className="block">
          <span className="text-sm text-white/70">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded border border-white/20 bg-black px-3 py-2 outline-none focus:border-green-500"
          />
        </label>

        <label className="block">
          <span className="text-sm text-white/70">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isSignup ? "new-password" : "current-password"}
            className="mt-1 w-full rounded border border-white/20 bg-black px-3 py-2 outline-none focus:border-green-500"
          />
          {isSignup && (
            <span className="mt-1 block text-xs text-white/40">
              At least 8 characters.
            </span>
          )}
        </label>

        {state.error && (
          <p
            role="alert"
            className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            {state.error}
          </p>
        )}

        <SubmitButton label={isSignup ? "Sign up" : "Log in"} />
      </form>

      <p className="mt-6 text-center text-sm text-white/50">
        {isSignup ? "Already have an account? " : "No account yet? "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="text-white underline"
        >
          {isSignup ? "Log in" : "Sign up"}
        </Link>
      </p>
    </div>
  );
}
