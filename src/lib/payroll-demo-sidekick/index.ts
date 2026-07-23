import storeJson from "./steps.json";

// Payroll Demo Sidekick data layer — a standalone tab, independent of the
// other Sidekicks. One curated store grounded in the globalpayrolldemoCN
// release recording (MP4 + VTT): steps follow the recorded screen order, and
// every question asked on the call is mapped to the step where it was asked,
// with the answer that was given. All country references are neutralized to
// "[any country]" so the flow works for any market.

export type PayrollDemoStep = {
  id: string;
  title: string;
  timestampStart: string;
  timestampEnd: string;
  navContext: string;
  visualSummary: string;
  onScreen: string[];
  say: string;
  demoPurpose: string;
};

export type PayrollDemoQuestion = {
  id: string;
  stepId: string;
  atTimestamp: string;
  asker: string;
  question: string;
  askedWhileShowing: string;
  answer: string;
  answerQuote: string;
  status: "answered" | "deferred" | "follow-up";
};

export type PayrollDemoMeta = {
  note: string;
  source: {
    releaseTag: string;
    recording: string;
    recordingSha256: string;
    transcript: string;
    transcriptSha256: string;
    durationTimestamp: string;
  };
  speakers: string;
  neutralization: string;
  screenshotDir: string;
};

type Store = {
  meta: PayrollDemoMeta;
  steps: PayrollDemoStep[];
  questions: PayrollDemoQuestion[];
};

const store = storeJson as Store;

export const payrollDemoMeta = store.meta;
export const payrollDemoSteps = store.steps;
export const payrollDemoQuestions = store.questions;

const stepById = new Map(payrollDemoSteps.map((s) => [s.id, s]));

export function getPayrollDemoStep(id: string): PayrollDemoStep | undefined {
  return stepById.get(id);
}

export function questionsForStep(stepId: string): PayrollDemoQuestion[] {
  return payrollDemoQuestions.filter((q) => q.stepId === stepId);
}

export function payrollDemoScreenshotPath(id: string): string {
  return `/demo-screens/payroll-demo/${id}.jpg`;
}
