// The Intake shelf for the browser suite (pass 15): the bookmarklet shelf
// and the payroll form, with a small book.

import { CaptureShelf } from "@/app/intake/capture-shelf";
import { PayrollForm } from "@/app/intake/payroll-form";

const BOOK = [
  { id: "001F000000w38BOIAY", name: "Simploy" },
  { id: "001F000000w38OHIAY", name: "Regis HR Group" },
];

export default function Fixture() {
  return (
    <main>
      <CaptureShelf accounts={BOOK} />
      <PayrollForm accounts={BOOK} />
    </main>
  );
}
