// Per-account engagement: the CSM's meeting cadence with the client, a running
// CSM-notes/health read, and the prep gates you owe yourself before working an
// account through its partner. The partner-first motion runs on the CSM's
// existing client meetings — so knowing the cadence lets you ask to ride along.

export type ClientHealth = "" | "green" | "yellow" | "red";

export type Engagement = {
  cadence: string; // "Weekly" | "Biweekly" | "Monthly" | "Quarterly" | "Ad hoc" | free text
  meetingDay: string; // e.g. "Thursday"
  nextMeeting: string; // yyyy-mm-dd ("" = unset)
  clientHealth: ClientHealth;
  csmNotes: string;
  sfChecked: boolean; // Salesforce research pulled
  sfCheckedAt: string; // ISO ("" = never)
};

export const EMPTY_ENGAGEMENT: Engagement = {
  cadence: "",
  meetingDay: "",
  nextMeeting: "",
  clientHealth: "",
  csmNotes: "",
  sfChecked: false,
  sfCheckedAt: "",
};

export const CADENCE_OPTIONS = ["Weekly", "Biweekly", "Monthly", "Quarterly", "Ad hoc"] as const;

// The three prep gates you owe yourself before reaching out about an account.
// Not a hard block — a visible checklist so you're not acting on stale ground.
export function engagementGates(e: Engagement) {
  const sf = e.sfChecked;
  const notes = e.csmNotes.trim().length > 0;
  const health = e.clientHealth !== "";
  const count = [sf, notes, health].filter(Boolean).length;
  return { sf, notes, health, count, done: count === 3 };
}

function firstNameOf(name: string): string {
  return (name || "").trim().split(/\s+/)[0] || "there";
}

// "I know you're meeting them — can I join?" — the ask that gets you in the room
// without adding a meeting to anyone's calendar. Shaped by whatever cadence is set.
export function askToJoinMessage(csm: string, account: string, e: Engagement): string {
  const who = firstNameOf(csm);
  const rhythm = [e.cadence, e.meetingDay ? `(${e.meetingDay})` : ""].filter(Boolean).join(" ").trim();
  const when = rhythm ? `your ${rhythm} check-in with ${account}` : `your next check-in with ${account}`;
  return (
    `Hi ${who} — I know you have ${when} coming up. Would it be alright if I sat in for a few ` +
    `minutes? I'd stay in the background — I just want to get a feel for ${account}'s world before ` +
    `we ever talk Global, and riding along on a meeting you're already having is the best way for ` +
    `me to learn without putting another thing on their calendar. Totally fine if the timing isn't ` +
    `right. Thanks so much!`
  );
}
