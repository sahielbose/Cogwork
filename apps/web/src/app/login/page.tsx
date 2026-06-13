"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setLoading(true);
    await signIn("email", { email, callbackUrl: "/app" });
  }

  return (
    <main className="min-h-screen grid place-items-center bg-paper-2 px-6">
      <div className="w-full max-w-sm rounded-xl border border-line bg-paper shadow-md p-8">
        <div className="flex justify-center mb-6">
          <Wordmark markSize={26} />
        </div>
        <h1 className="text-xl font-display font-semibold text-center mb-1">Welcome back</h1>
        <p className="text-sm text-muted text-center mb-6">
          Sign in to your Cogwork studio.
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Continue with email →"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-subtle">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <Button variant="secondary" className="w-full" disabled title="Available at go-live">
          Continue with Google
        </Button>
        <p className="mt-3 text-center text-[11px] text-subtle">
          Google sign-in activates once OAuth is configured (Phase 3).
        </p>

        <p className="mt-6 text-center text-[11px] text-subtle">
          By continuing you agree to the Terms and Privacy Policy.
        </p>
      </div>
    </main>
  );
}
