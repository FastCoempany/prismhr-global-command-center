"use server";

// The facts the operator sets by hand on a HomeRoom sentence (ship order
// 2026-11-04, F26): reseller or referral, the client's name, and countries
// added or taken off the deal. One facts:<accountId> note per account, newest
// wins; each change rewrites the whole overlay, so ↺ is a plain write of the
// overlay without that field. The record is never touched: the sentence
// reads the record first and the hand on top of it, marked as the hand's.

import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { peos } from "@/lib/book";
import { bindAccountId } from "@/lib/room/bind";
import { createAccountNoteRow } from "@/lib/notes/write";
import { redactMoney, COUNTRY_NAME } from "@/lib/intel/lexicon";
import {
  FACTS_NS,
  parseHandFacts,
  renderHandFacts,
  type Chair,
  type HandFacts,
} from "@/lib/room/facts";

export type FactChange =
  | { field: "chair"; value: Chair | null }
  | { field: "client"; value: string | null }
  | { field: "add"; code: string }
  | { field: "remove"; code: string }
  | { field: "unadd" }
  | { field: "unremove" };

const md = (d: Date): string =>
  d.toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "numeric",
    day: "numeric",
  });

/** Apply one change to an overlay. Pure, so the suite pins it. */
export async function applyFactChange(
  h: HandFacts,
  c: FactChange,
  day: string,
): Promise<HandFacts> {
  const next: HandFacts = {
    ...h,
    add: [...h.add],
    remove: [...h.remove],
    day: { ...h.day },
  };
  if (c.field === "chair") {
    if (c.value) {
      next.chair = c.value;
      next.day.chair = day;
    } else {
      delete next.chair;
      delete next.day.chair;
    }
  } else if (c.field === "client") {
    const name = (c.value ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
    if (name) {
      next.client = redactMoney(name);
      next.day.client = day;
    } else {
      delete next.client;
      delete next.day.client;
    }
  } else if (c.field === "add" || c.field === "remove") {
    const code = (c.code ?? "").toLowerCase();
    if (!COUNTRY_NAME[code]) return h;
    const other = c.field === "add" ? "remove" : "add";
    // Adding a country taken off by hand puts it back; removing one added by
    // hand takes the hand away. Neither leaves a mark in both lists.
    if (next[other].includes(code)) next[other] = next[other].filter((x) => x !== code);
    else if (!next[c.field].includes(code)) next[c.field].push(code);
    if (next.add.length) next.day.add = day;
    else delete next.day.add;
    if (next.remove.length) next.day.remove = day;
    else delete next.day.remove;
  } else if (c.field === "unadd") {
    next.add = [];
    delete next.day.add;
  } else if (c.field === "unremove") {
    next.remove = [];
    delete next.day.remove;
  }
  return next;
}

export async function setRowFact(
  accountId: string,
  change: FactChange,
): Promise<{ ok: boolean; reason?: string }> {
  const acct = bindAccountId(accountId, peos);
  if (!acct) return { ok: false, reason: "Not a bound row." };
  if (!hasDatabaseEnv()) return { ok: false, reason: "Read-only session." };
  const access = await getAppAccess();
  if (access.status !== "active" || !access.canWrite)
    return { ok: false, reason: "Read-only session." };
  const ns = `${FACTS_NS}${acct.id}`;
  try {
    const prisma = getPrisma();
    const rows = await prisma.accountNote.findMany({
      where: { accountId: ns },
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { body: true },
    });
    const next = await applyFactChange(
      parseHandFacts(rows[0]?.body),
      change,
      md(new Date()),
    );
    await prisma.accountNote.deleteMany({ where: { accountId: ns } });
    const empty = !next.chair && !next.client && !next.add.length && !next.remove.length;
    if (!empty)
      await createAccountNoteRow({
        accountId: ns,
        kind: "mine",
        body: renderHandFacts(next),
        door: "hand",
        lane: "mine",
        source: "facts",
      });
    return { ok: true };
  } catch {
    return { ok: false, reason: "That didn't save. Try again." };
  }
}
