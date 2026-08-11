"use client";

// The Global Payroll Intake Form, mirrored field-for-field from the MS Form —
// pick an account and every answer prefills from its derived DealIntel.
// MS Forms has NO supported URL-prefill, so three delivery paths ship:
// the ⚡ Fill form bookmarklet (clipboard JSON → native-setter injection),
// per-field 📋 copies, and one copy-all block. The app never talks to Forms.

import { useEffect, useRef, useState } from "react";
import { getDealIntel, type PayrollPrefill } from "./actions";
import styles from "../command-center.module.css";

export const FORM_URL =
  "https://forms.office.com/Pages/ResponsePage.aspx?id=4AKILmgL0EmFf0bnR1b5dMX1zZe2SdFDtNToKj9tUsFUNEY4TjVZQVNJMEFRR1pFWEM2ODlBSTI3WS4u";

const BILLING_OPTIONS = [
  "Reseller- Wholesale pricing for Service Provider to Resell",
  "Referral- List Price and we will be selling direct",
];
const PLATFORM_OPTIONS = ["HCM", "PrismHR", "Execupay"];
const COMP_OPTIONS = ["Hourly", "Salary"];
const FUNC_OPTIONS = ["Time and Labor", "Expense Mgmt"];

type Answers = {
  provider: string;
  billing: string;
  smb: string;
  platform: string;
  country: string;
  employees: string;
  visa: string;
  compensation: string[];
  frequency: string;
  currentSystem: string;
  industry: string;
  functionality: string[];
  functionalityOther: string;
  gbc: string;
  misc: string;
};

const EMPTY: Answers = {
  provider: "",
  billing: "",
  smb: "",
  platform: "",
  country: "",
  employees: "",
  visa: "",
  compensation: [],
  frequency: "",
  currentSystem: "",
  industry: "",
  functionality: [],
  functionalityOther: "",
  gbc: "Antaeus Coe",
  misc: "",
};

// The bookmarklet payload: question text (matched inside
// [data-automation-id="questionItem"]) + text value or choice list.
type PayloadField =
  | { q: string; t: "text"; v: string }
  | { q: string; t: "choice"; v: string[] };

function payloadFor(a: Answers): PayloadField[] {
  const funcChoices = [...a.functionality];
  return [
    { q: "Name of Service Provider", t: "text", v: a.provider },
    {
      q: "Global Billing Method For Service Provider",
      t: "choice",
      v: a.billing ? [a.billing] : [],
    },
    { q: "Name of SMB", t: "text", v: a.smb },
    { q: "Select HCM Platform", t: "choice", v: a.platform ? [a.platform] : [] },
    { q: "Country", t: "text", v: a.country },
    { q: "Number of Employees", t: "text", v: a.employees },
    { q: "Visa Registration or Sponsorship Needed", t: "text", v: a.visa },
    { q: "Compensation Type", t: "choice", v: a.compensation },
    { q: "Payroll Frequency", t: "text", v: a.frequency },
    { q: "Current System Used", t: "text", v: a.currentSystem },
    { q: "Industry or Type of Employees", t: "text", v: a.industry },
    { q: "Functionality Needed", t: "choice", v: funcChoices },
    { q: "GBC Requested Name", t: "text", v: a.gbc },
    { q: "Miscellaneous Information", t: "text", v: a.misc },
  ];
}

function copyAllText(a: Answers): string {
  return payloadFor(a)
    .map((f) => `${f.q}: ${f.t === "text" ? f.v : f.v.join(", ")}`)
    .concat(
      a.functionalityOther ? [`Functionality (Other): ${a.functionalityOther}`] : [],
    )
    .join("\n");
}

// The ⚡ Fill form bookmarklet — reads the copied JSON, matches each MS Forms
// question container by its heading text, and sets values with the React
// native-setter trick (plain .value assignment gets reverted by React).
function fillBookmarklet(): string {
  const js = `(async()=>{let d;try{d=JSON.parse(await navigator.clipboard.readText())}catch(e){alert('First click "Copy for bookmarklet" in the app, then click this on the form page.');return}if(!Array.isArray(d)){alert('Clipboard does not hold the form payload. Click "Copy for bookmarklet" first.');return}const items=[...document.querySelectorAll('[data-automation-id="questionItem"]')];if(items.length===0){alert('No form questions found. Open the intake form first.');return}const setV=(el,v)=>{const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const s=Object.getOwnPropertyDescriptor(proto,'value').set;s.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};let n=0;for(const f of d){const it=items.find(x=>x.innerText.replace(/\\s+/g,' ').includes(f.q));if(!it)continue;if(f.t==='text'){if(!f.v)continue;const inp=it.querySelector('input[type="text"],textarea');if(inp){setV(inp,f.v);n++}}else{for(const c of f.v){const labs=[...it.querySelectorAll('label')];const lab=labs.find(l=>l.innerText.replace(/\\s+/g,' ').trim().startsWith(c.slice(0,28)));if(lab){lab.click();n++}}}}alert('Filled '+n+' answers. Review and Submit.')})()`;
  return `javascript:${js}`;
}

function CopyBtn({ payload, label = "📋" }: { payload: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className={styles.atcBtn}
      title="Copy"
      onClick={() => {
        void navigator.clipboard.writeText(payload);
        setOk(true);
        setTimeout(() => setOk(false), 1200);
      }}
    >
      {ok ? "✓" : label}
    </button>
  );
}

export function PayrollForm({ accounts }: { accounts: { id: string; name: string }[] }) {
  const [accountId, setAccountId] = useState("");
  const [a, setA] = useState<Answers>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [copiedAll, setCopiedAll] = useState<"" | "all" | "payload">("");
  const bmRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    bmRef.current?.setAttribute("href", fillBookmarklet());
  }, []);

  const pick = async (id: string) => {
    setAccountId(id);
    if (!id) return;
    setLoading(true);
    const p: PayrollPrefill | null = await getDealIntel(id);
    setLoading(false);
    if (!p) return;
    setA({
      provider: p.provider,
      billing: p.billing,
      smb: p.smb,
      platform: p.platform,
      country: p.country,
      employees: p.employees,
      visa: p.visa,
      compensation: p.compensation,
      frequency: p.frequency,
      currentSystem: p.currentSystem,
      industry: "",
      functionality: p.functionality,
      functionalityOther: "",
      gbc: p.gbc,
      misc: p.misc,
    });
  };

  const set = (patch: Partial<Answers>) => setA((cur) => ({ ...cur, ...patch }));
  const toggleIn = (key: "compensation" | "functionality", v: string) =>
    setA((cur) => ({
      ...cur,
      [key]: cur[key].includes(v) ? cur[key].filter((x) => x !== v) : [...cur[key], v],
    }));

  const text = (
    label: string,
    key: keyof Answers & string,
    opts: { area?: boolean; hint?: string } = {},
  ) => (
    <div className={styles.field}>
      <label>
        {label} <CopyBtn payload={String(a[key] ?? "")} />
      </label>
      {opts.area ? (
        <textarea
          value={String(a[key] ?? "")}
          onChange={(e) => set({ [key]: e.target.value } as Partial<Answers>)}
          rows={3}
        />
      ) : (
        <input
          value={String(a[key] ?? "")}
          onChange={(e) => set({ [key]: e.target.value } as Partial<Answers>)}
        />
      )}
      {opts.hint && <p className={styles.hint}>{opts.hint}</p>}
    </div>
  );

  const radio = (label: string, key: "billing" | "platform", options: string[]) => (
    <div className={styles.field}>
      <label>
        {label} <CopyBtn payload={a[key]} />
      </label>
      {options.map((o) => (
        <label key={o} className={styles.toggle}>
          <input
            type="radio"
            name={key}
            checked={a[key] === o}
            onChange={() => set({ [key]: o } as Partial<Answers>)}
          />
          {o}
        </label>
      ))}
    </div>
  );

  return (
    <div className={styles.inkWrap}>
      <section className={styles.inkPane}>
        <div className={styles.inkBar}>
          <select
            className={styles.inkSelect}
            value={accountId}
            onChange={(e) => void pick(e.target.value)}
            aria-label="Account"
          >
            <option value="">Prefill from account…</option>
            {accounts.map((acct) => (
              <option key={acct.id} value={acct.id}>
                {acct.name}
              </option>
            ))}
          </select>
          {loading && <span className={styles.muted}>deriving intel…</span>}
        </div>

        {text("1. Name of Service Provider *", "provider")}
        {radio(
          "2. Global Billing Method For Service Provider *",
          "billing",
          BILLING_OPTIONS,
        )}
        {text("3. Name of SMB *", "smb", { hint: `"unknown" is allowed` })}
        {radio("4. Select HCM Platform *", "platform", PLATFORM_OPTIONS)}
        {text("5. Country *", "country")}
        {text("6. Number of Employees *", "employees")}
        {text("7. Visa Registration or Sponsorship Needed?", "visa")}
        <div className={styles.field}>
          <label>
            8. Compensation Type * <CopyBtn payload={a.compensation.join(", ")} />
          </label>
          {COMP_OPTIONS.map((o) => (
            <label key={o} className={styles.toggle}>
              <input
                type="checkbox"
                checked={a.compensation.includes(o)}
                onChange={() => toggleIn("compensation", o)}
              />
              {o}
            </label>
          ))}
        </div>
        {text("9. Payroll Frequency *", "frequency")}
        {text("10. Current System Used", "currentSystem")}
        {text("11. Industry or Type of Employees/Titles", "industry", { area: true })}
        <div className={styles.field}>
          <label>
            12. Functionality Needed *{" "}
            <CopyBtn
              payload={[...a.functionality, a.functionalityOther]
                .filter(Boolean)
                .join(", ")}
            />
          </label>
          {FUNC_OPTIONS.map((o) => (
            <label key={o} className={styles.toggle}>
              <input
                type="checkbox"
                checked={a.functionality.includes(o)}
                onChange={() => toggleIn("functionality", o)}
              />
              {o}
            </label>
          ))}
          <input
            value={a.functionalityOther}
            onChange={(e) => set({ functionalityOther: e.target.value })}
            placeholder="Other…"
            aria-label="Functionality — other"
          />
        </div>
        {text("13. GBC Requested Name *", "gbc")}
        {text("14. Miscellaneous Information", "misc", { area: true })}
      </section>

      <aside className={styles.inkAside}>
        <h2 className={styles.h2}>Send it to the MS Form</h2>
        <p className={styles.muted}>
          Forms has no URL-prefill. Three ways in, best first:
        </p>
        <div className={styles.inkBar}>
          <button
            type="button"
            className={styles.atcBtn}
            onClick={() => {
              void navigator.clipboard.writeText(JSON.stringify(payloadFor(a)));
              setCopiedAll("payload");
              setTimeout(() => setCopiedAll(""), 1500);
            }}
          >
            {copiedAll === "payload" ? "Copied ✓" : "Copy for bookmarklet"}
          </button>
        </div>
        <a
          ref={bmRef}
          className={styles.inkBookmarklet}
          title="Drag me to the bookmarks bar. Don't click here."
        >
          ⚡ Fill form
        </a>
        <p className={styles.mutedSm}>
          One-time: drag ⚡ Fill form to your bookmarks bar. Then: click “Copy for
          bookmarklet” here, open the form, click the bookmarklet. It fills every matched
          question; you review and Submit. Radios and checkboxes click their labels; text
          lands via the React-safe setter.
        </p>
        <div className={styles.inkBar}>
          <button
            type="button"
            className={styles.atcBtn}
            onClick={() => {
              void navigator.clipboard.writeText(copyAllText(a));
              setCopiedAll("all");
              setTimeout(() => setCopiedAll(""), 1500);
            }}
          >
            {copiedAll === "all" ? "Copied ✓" : "Copy all answers"}
          </button>
          <a href={FORM_URL} target="_blank" rel="noreferrer" className={styles.atcBtn}>
            Open form ↗
          </a>
        </div>
        <p className={styles.mutedSm}>
          Fallbacks: every field has its own 📋; “Copy all answers” gives Q:&nbsp;A lines
          to paste anywhere.
        </p>
      </aside>
    </div>
  );
}
