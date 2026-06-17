import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { getAppAccess } from "@/lib/auth";
import { signIn } from "../auth/actions";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

function safeNext(next: string | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/prospect-field";
  }
  return next;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const next = safeNext(params.next);
  const access = await getAppAccess();

  if (access.status === "active") {
    redirect(next);
  }

  return (
    <main className="min-h-screen bg-[color:var(--color-canvas)] p-5 text-[color:var(--color-ink)]">
      <section className="mx-auto grid min-h-[calc(100vh-40px)] max-w-[920px] items-center gap-6 md:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          <p className="text-xs font-bold leading-4 text-[color:var(--color-ink-support)]">
            Field Signal access
          </p>
          <h1 className="max-w-xl text-3xl font-semibold leading-10">
            Enter the access code to open Prospect Field.
          </h1>
          <div className="grid gap-3 sm:grid-cols-3">
            {["Code gate", "Cloud database", "Owner writes"].map((item) => (
              <div
                className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4 text-sm font-semibold leading-5"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <section className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
          <p className="text-xs font-bold leading-4 text-[color:var(--color-ink-support)]">
            Sign in
          </p>
          <h2 className="mb-4 text-xl font-semibold leading-7">Access code</h2>

          {params.error ? (
            <div className="mb-4 rounded-lg border border-[color:var(--color-high-border)] bg-[color:var(--color-high-bg)] p-3 text-sm font-semibold leading-5">
              {params.error}
            </div>
          ) : null}

          <form action={signIn} className="grid gap-4">
            <input name="next" type="hidden" value={next} />
            <Field label="Code" name="code" required>
              <Input
                autoComplete="one-time-code"
                id="code"
                inputMode="numeric"
                maxLength={12}
                name="code"
                required
                type="password"
              />
            </Field>
            <Button type="submit">Enter</Button>
          </form>
        </section>
      </section>
    </main>
  );
}
