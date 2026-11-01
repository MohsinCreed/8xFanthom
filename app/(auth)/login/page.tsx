import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="mb-6 inline-flex items-center gap-2 font-heading text-base font-semibold tracking-tight text-foreground">
          <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
          8x Fathom AI
        </p>
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Sign in to your workspace
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Use the demo account to explore meetings, summaries and clips.
          </p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
