"use client";

import { authClient } from "@/src/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

type Mode = "sign-in" | "sign-up";

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl bg-paper px-4 font-normal outline-none ring-1 ring-transparent placeholder:text-mute focus:ring-ink";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [pending, setPending] = useState(false);
  const isSignUp = mode === "sign-up";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const { error } = isSignUp
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });

      if (error) {
        setError(error.message || "Something went wrong. Please try again.");
        setPending(false);
        return;
      }
      router.push("/collection");
      router.refresh();
    } catch (error) {
      setError(
        "Could not reach the server. Check your connection and try again.",
      );
      setPending(false);
    }
  }
  return (
    <div className="mx-auto max-w-md pt-4 sm:pt-10">
      <div className="rounded-[32px] bg-white p-8 shadow-soft">
        <div aria-hidden className="flex gap-1.5">
          <span className="block h-10 w-4 -skew-x-12 bg-gold-500" />
          <span className="block h-10 w-1.5 -skew-x-12 bg-ink" />
        </div>

        <h1 className="mt-5 font-display text-3xl font-extrabold">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-mute">
          {isSignUp
            ? "Join CollectorHub and start your collection."
            : "Sign in to continue your collection."}
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {isSignUp && (
            <label className="block text-sm font-semibold">
              Name
              <input
                name="name"
                type="text"
                required
                maxLength={40}
                autoComplete="name"
                className={inputClass}
              />
            </label>
          )}

          <label className="block text-sm font-semibold">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-semibold">
            Password
            <input
              name="password"
              type="password"
              required
              minLength={isSignUp ? 8 : undefined}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className={inputClass}
            />
            {isSignUp && (
              <span className="mt-1.5 block text-xs font-normal text-mute">
                At least 8 characters.
              </span>
            )}
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-[#FFE3D6] px-4 py-3 text-sm font-semibold text-[#B8441A]"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="h-12 w-full rounded-full bg-ink text-sm font-semibold text-white hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
          >
            {pending
              ? isSignUp
                ? "Creating account…"
                : "Signing in…"
              : isSignUp
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-mute">
          {isSignUp ? "Already have an account? " : "New here? "}
          <Link
            href={isSignUp ? "/sign-in" : "/sign-up"}
            className="font-semibold text-ink underline underline-offset-4"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  );
}
