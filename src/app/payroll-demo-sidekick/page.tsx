import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import {
  payrollDemoMeta,
  payrollDemoQuestions,
  payrollDemoSteps,
} from "@/lib/payroll-demo-sidekick";
import { PayrollDemoClient } from "./payroll-demo-client";

export const metadata = {
  title: "Payroll Demo Sidekick",
};

export default async function PayrollDemoSidekickPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Every page signs in (ruled 2026-09-25).
  const access = await getAppAccess();
  if (access.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Payroll Demo Sidekick" />
        <main className="app-main">
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  const params = await searchParams;
  const pick = (k: string) => {
    const v = params[k];
    return typeof v === "string" ? v : undefined;
  };

  return (
    <>
      <AppWayfinder current="Payroll Demo Sidekick" />
      <PayrollDemoClient
        meta={payrollDemoMeta}
        steps={payrollDemoSteps}
        questions={payrollDemoQuestions}
        initialStepId={pick("step")}
        initialLens={pick("lens") === "questions" ? "questions" : "flow"}
      />
    </>
  );
}
