// The draft desk as the Accounts drilldown opens it (accounts-client.tsx,
// DraftDialog), in the sheet's frame: its one cited line rides the top.

import { DraftDialog } from "@/app/accounts-client";
import styles from "@/app/command-center.module.css";

const contact = {
  id: "c1",
  first: "Dana",
  last: "Ruiz",
  email: "dana@simploy.com",
  title: "Payroll lead",
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "",
  phone: "",
  mobile: "",
  owner: "",
};

export default function Fixture() {
  return (
    <main className={styles.wrap}>
      <DraftDialog
        accountId="001F000000w38BOIAY"
        accountName="Simploy"
        contact={contact}
        others={[]}
        onClose={() => {}}
      />
    </main>
  );
}
