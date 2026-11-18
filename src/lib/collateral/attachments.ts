// What the stage's Send in Outlook can carry (ship order
// 2026-10-22; the demos replaced 2026-11-18): two whole demos, the one-pagers, and the reseller and
// referral agreements as review copies watermarked REVIEW COPY on every
// page. Every file is 5,000,000 bytes or less, so it travels in a normal
// email; the suite fails the build on a file that grows past it or goes
// missing (tests/collateral-attachments.test.ts). The files live in the
// repo and leave the app only through the signed-in route
// (src/app/groundwork/attach/[id]/route.ts) into the operator's own Outlook
// draft. Nothing here renders: the app shows each file's name and size.

export type AttachmentGroup = "demo" | "onepager" | "agreement";

export type Attachment = {
  id: string;
  group: AttachmentGroup;
  /** What the picker shows. */
  label: string;
  /** How long a demo runs, as the picker shows it; "" for a document. */
  runs: string;
  /** The file in the repo, from its root. */
  path: string;
  /** The name the file carries in the email. */
  name: string;
  bytes: number;
  mime: string;
};

/** No file over this travels: the operator's rule for a normal email. */
export const ATTACH_MAX_BYTES = 5_000_000;

/** Base64 grows a file by four bytes in three, plus a line break per 76. */
export const encodedBytes = (bytes: number): number => {
  const b64 = Math.ceil(bytes / 3) * 4;
  return b64 + Math.ceil(b64 / 76) * 2;
};

/** Most mail servers turn away a message past this, encoded. */
export const MAIL_SOFT_CAP = 20_000_000;

const demo = (
  id: string,
  label: string,
  runs: string,
  file: string,
  bytes: number,
): Attachment => ({
  id,
  group: "demo",
  label,
  runs,
  path: `collateral/demos/${file}`,
  name: `PrismHR Global demo - ${label}.mp4`,
  bytes,
  mime: "video/mp4",
});

export const ATTACHMENTS: readonly Attachment[] = [
  demo(
    "demo-employer",
    "The platform, employer side",
    "36:43",
    "platform-demo-employer.mp4",
    4_410_003,
  ),
  demo(
    "demo-listopay",
    "ListoPay, the contractor's wallet",
    "28:46",
    "listo-pay-demo.mp4",
    4_452_872,
  ),
  {
    id: "onepager-overview",
    group: "onepager",
    label: "PrismHR Global at a glance",
    runs: "",
    path: "intelligence/flyers/PrismHR_Global_Overview_OnePager.pdf",
    name: "PrismHR Global at a glance.pdf",
    bytes: 103_508,
    mime: "application/pdf",
  },
  {
    id: "onepager-eor",
    group: "onepager",
    label: "Employer of record",
    runs: "",
    path: "intelligence/flyers/PrismHR_Global_EOR_Flyer.pdf",
    name: "PrismHR Global - Employer of Record.pdf",
    bytes: 478_578,
    mime: "application/pdf",
  },
  {
    id: "onepager-payroll",
    group: "onepager",
    label: "Global payroll",
    runs: "",
    path: "intelligence/flyers/PrismHR_Global_Payroll_Flyer.pdf",
    name: "PrismHR Global - Global Payroll.pdf",
    bytes: 432_923,
    mime: "application/pdf",
  },
  {
    id: "onepager-contractor",
    group: "onepager",
    label: "Contractor solutions",
    runs: "",
    path: "intelligence/flyers/PrismHR_Global_Contractor_Solutions_Flyer.pdf",
    name: "PrismHR Global - Contractor Solutions.pdf",
    bytes: 421_035,
    mime: "application/pdf",
  },
  {
    id: "onepager-talent",
    group: "onepager",
    label: "Talent",
    runs: "",
    path: "intelligence/flyers/PrismHR_Global_Talent_Flyer.pdf",
    name: "PrismHR Global - Talent.pdf",
    bytes: 491_901,
    mime: "application/pdf",
  },
  {
    id: "agreement-reseller",
    group: "agreement",
    label: "Reseller agreement, review copy",
    runs: "",
    path: "collateral/agreements/resale-review-copy.pdf",
    name: "PrismHR Global Resale Agreement - Review Copy.pdf",
    bytes: 138_013,
    mime: "application/pdf",
  },
  {
    id: "agreement-referral",
    group: "agreement",
    label: "Referral agreement, review copy",
    runs: "",
    path: "collateral/agreements/referral-review-copy.pdf",
    name: "PrismHR Global Referral Agreement - Review Copy.pdf",
    bytes: 48_474,
    mime: "application/pdf",
  },
];

/** The picker's groups, in the order it shows them. */
export const ATTACH_GROUPS: readonly { group: AttachmentGroup; kicker: string }[] = [
  { group: "demo", kicker: "Demos" },
  { group: "onepager", kicker: "One-pagers" },
  { group: "agreement", kicker: "Agreements" },
];

export const attachmentById = (id: string): Attachment | undefined =>
  ATTACHMENTS.find((a) => a.id === id);

/** Files the library once carried (ship order 2026-11-18): the 41-minute
 *  recording and its twelve chapters, retired because the recording carried
 *  a partner's own slide and voices. They no longer travel, but a send on
 *  file still names them, so the record keeps their names. */
export const RETIRED_ATTACHMENTS: Readonly<Record<string, string>> = {
  "demo-whole": "The whole platform",
  "demo-signin": "Sign-in and worker types",
  "demo-portal": "The worker portal",
  "demo-invoices": "Invoices, reseller and referral",
  "demo-settings": "Settings and client pricing",
  "demo-payperiods": "Pay periods and gross to net",
  "demo-funding": "Funding, wallet and approvals",
  "demo-team": "The team view",
  "demo-newhire": "A new EOR hire",
  "demo-benefits": "Benefits and the offer letter",
  "demo-contractor": "Contractor pay and support",
  "demo-users": "Users and permissions",
  "demo-approvals": "Approval workflows",
};

/** The name a file goes by on the record, retired files included. */
export const attachmentLabel = (id: string): string | undefined =>
  attachmentById(id)?.label ?? RETIRED_ATTACHMENTS[id];

/** A size as the picker shows it: "4.9 MB", "104 KB". */
export function sizeLabel(bytes: number): string {
  return bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1_000))} KB`;
}

/** The route serves a file in pieces this size, under Vercel's 4.5 MB cap on
 *  a function's response. */
export const ATTACH_PIECE_BYTES = 3_000_000;
