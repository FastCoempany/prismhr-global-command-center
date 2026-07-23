import { AppWayfinder } from "@/components/app-wayfinder";
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
