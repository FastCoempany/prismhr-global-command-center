import { redirect } from "next/navigation";
import { ProductLockup } from "@/components/brand";
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
    return "/";
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
    <main className="grid min-h-screen place-items-center bg-[color:var(--ds-field)] p-5 text-[color:var(--ds-ink)]">
      <section className="ds-card ds-card--edge-orange w-full max-w-sm">
        <span aria-hidden="true" className="ds-gauge ds-gauge--orange" />
        <div className="ds-card__body">
          <ProductLockup />
          <h1 className="ds-heading--title mt-3">Enter access code</h1>

          {params.error ? <div className="ds-error">{params.error}</div> : null}

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
        </div>
      </section>
    </main>
  );
}
