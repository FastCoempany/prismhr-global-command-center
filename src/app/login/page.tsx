import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { getAppAccess } from "@/lib/auth";
import { requestAccess, signIn } from "../auth/actions";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
    notice?: string;
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
      <section className="mx-auto grid min-h-[calc(100vh-40px)] max-w-[1120px] items-center gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-4">
          <p className="text-xs font-bold leading-4 text-[color:var(--color-ink-support)]">
            Field Signal access
          </p>
          <h1 className="max-w-2xl text-3xl font-semibold leading-10">
            Protect the prospect field before expanding the workflow.
          </h1>
          <div className="grid gap-3 sm:grid-cols-3">
            {["Cloud session", "Active workspace user", "Owner-gated writes"].map(
              (item) => (
                <div
                  className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4 text-sm font-semibold leading-5"
                  key={item}
                >
                  {item}
                </div>
              ),
            )}
          </div>
        </div>

        <section className="rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
          <p className="text-xs font-bold leading-4 text-[color:var(--color-ink-support)]">
            Sign in
          </p>
          <h2 className="mb-4 text-xl font-semibold leading-7">Workspace account</h2>

          {params.error ? (
            <div className="mb-4 rounded-lg border border-[color:var(--color-high-border)] bg-[color:var(--color-high-bg)] p-3 text-sm font-semibold leading-5">
              {params.error}
            </div>
          ) : null}

          {params.notice ? (
            <div className="mb-4 rounded-lg border border-[color:var(--color-low-border)] bg-[color:var(--color-low-bg)] p-3 text-sm font-semibold leading-5">
              {params.notice}
            </div>
          ) : null}

          {access.status === "pending" ? (
            <div className="mb-4 rounded-lg border border-[color:var(--color-medium-border)] bg-[color:var(--color-medium-bg)] p-3 text-sm font-semibold leading-5">
              Signed in as {access.authEmail}. Workspace activation is still pending.
            </div>
          ) : null}

          <form action={signIn} className="grid gap-4">
            <input name="next" type="hidden" value={next} />
            <Field label="Email" name="email" required>
              <Input autoComplete="email" id="email" name="email" required type="email" />
            </Field>
            <Field label="Password" name="password" required>
              <Input
                autoComplete="current-password"
                id="password"
                minLength={8}
                name="password"
                required
                type="password"
              />
            </Field>
            <Button type="submit">Sign in</Button>
          </form>

          <form
            action={requestAccess}
            className="mt-5 grid gap-4 border-t border-[color:var(--color-line)] pt-5"
          >
            <input name="next" type="hidden" value={next} />
            <p className="text-sm font-semibold leading-5 text-[color:var(--color-ink-soft)]">
              Request access with a password. An owner still has to activate your
              workspace user before records are visible.
            </p>
            <Field label="Email" name="email" required>
              <Input
                autoComplete="email"
                id="requestEmail"
                name="email"
                required
                type="email"
              />
            </Field>
            <Field label="Password" name="password" required>
              <Input
                autoComplete="new-password"
                id="requestPassword"
                minLength={8}
                name="password"
                required
                type="password"
              />
            </Field>
            <Button type="submit" variant="quiet">
              Request access
            </Button>
          </form>
        </section>
      </section>
    </main>
  );
}
