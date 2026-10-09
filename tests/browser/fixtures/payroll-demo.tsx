// The payroll demo sidekick for the browser suite (pass 15): the flow lens
// on arrival, from the lib's own static data.

import { PayrollDemoClient } from "@/app/payroll-demo-sidekick/payroll-demo-client";
import {
  payrollDemoMeta,
  payrollDemoQuestions,
  payrollDemoSteps,
} from "@/lib/payroll-demo-sidekick";

export default function Fixture() {
  return (
    <main>
      <PayrollDemoClient
        meta={payrollDemoMeta}
        steps={payrollDemoSteps}
        questions={payrollDemoQuestions}
        initialStepId={undefined}
        initialLens="flow"
      />
    </main>
  );
}
