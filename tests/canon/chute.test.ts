// The Chute's decrees, pinned as behavior (CLAUDE.md "The Chute", :274-289,
// and the 2026-09-25 rulings R2, R11, R12, R14 and D11, D12, D30). Every
// test here calls a function and checks what it returns; none reads a
// source file.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  CHUTE_PARALLEL,
  LEDGER_TEXT_CAP,
  chicagoDay,
  loadLedger,
  runLimited,
  saveLedger,
  storedRow,
  type LedgerRow,
  type LedgerStorage,
} from "../../src/app/room/chute-ledger";
import { emlToPaste, msgToPaste, pasteFingerprint } from "../../src/lib/paste-files";
import { readFileToText } from "../../src/app/room/read-file";
import { routingRoster } from "../../src/lib/book/roster";
import { routeCapture } from "../../src/lib/route-capture";
import { recordRowsWhere } from "../../src/lib/notes/record-rows";
import { isNamespacedAccountId } from "../../src/lib/today/overlay";
import { peos } from "../../src/lib/book";
import { GAP_NS } from "../../src/lib/room/gaps";
import {
  ACTIVITY_NS,
  GEMS_NS,
  INTENT_NS,
  STAGE_NS,
  SUPPORT_NS,
} from "../../src/lib/activity/stores";
import { WIRE_NS } from "../../src/lib/groundwork/wire";
import { INST_NS } from "../../src/lib/groundwork/institutions";
import { SCRATCH_GONE_NS, SCRATCH_NS } from "../../src/lib/scratch";
import { PIPELINE_EDIT_NS } from "../../src/lib/pipeline/edits";
import { ACT_DRAFT_NS, SEAT_NS } from "../../src/lib/act/lane";
import { RESEARCH_NS } from "../../src/lib/intel/deep-research";
import { SENDBOOK_NS } from "../../src/lib/sendbook/read";
import { PRESENCE_NS } from "../../src/lib/presence";

const NOW = new Date("2026-09-25T15:00:00Z"); // 10:00a Chicago, Fri Sep 25

const memory = (): LedgerStorage & { raw: () => string } => {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    raw: () => [...m.values()].join("\n"),
  };
};

const row = (over: Partial<LedgerRow> & { key: number; state: LedgerRow["state"] }) => ({
  filename: `${over.key}.eml`,
  ...over,
});

// ── E10 + C20 · "a disputed read waits for the operator's pick" (:283-284) and
// "The receipt ledger survives a reload" (:285-287) ────────────────────────
describe("a waiting pick survives a reload with its text (CLAUDE.md:283-287)", () => {
  test("a pick row with text comes back a pick row with the same text", () => {
    const storage = memory();
    const text = "OUTLOOK THREAD — dropped file 1.eml\nFrom: nobody@example.org\n\nhello";
    saveLedger(
      [
        row({
          key: 1,
          state: "pick",
          text,
          candidates: [
            {
              id: "A",
              name: "Acme",
              score: 55,
              why: "“acme” appears in the text",
              rung: "head",
            },
          ],
        }),
      ],
      storage,
      NOW,
    );
    const back = loadLedger(storage, NOW);
    assert.equal(back.items.length, 1);
    assert.equal(back.items[0].state, "pick");
    assert.equal(back.items[0].text, text);
    assert.equal(back.items[0].candidates?.[0]?.id, "A");
    assert.equal(back.maxKey, 1);
  });

  test("a mismatch row keeps its text and its state too", () => {
    const storage = memory();
    saveLedger(
      [row({ key: 2, state: "mismatch", text: "CALL TRANSCRIPT\nA: hi", claim: "Acme" })],
      storage,
      NOW,
    );
    const back = loadLedger(storage, NOW);
    assert.equal(back.items[0].state, "mismatch");
    assert.equal(back.items[0].text, "CALL TRANSCRIPT\nA: hi");
    assert.equal(back.items[0].claim, "Acme");
  });

  test("a row mid-read when the tab died comes back interrupted", () => {
    const storage = memory();
    saveLedger(
      [
        row({ key: 3, state: "reading" }),
        row({ key: 4, state: "filing", account: { id: "A", name: "Acme" } }),
        row({ key: 5, state: "activity", act: true }),
      ],
      storage,
      NOW,
    );
    const back = loadLedger(storage, NOW);
    for (const it of back.items) {
      assert.equal(it.state, "interrupted");
      assert.ok(it.reason, "an interrupted row says why");
    }
    assert.equal(back.items.find((x) => x.key === 5)?.act, true);
  });

  test("a pick whose text cannot be kept comes back interrupted, not a dead pick", () => {
    const storage = memory();
    saveLedger(
      [
        row({ key: 6, state: "pick", text: "x".repeat(LEDGER_TEXT_CAP + 1) }),
        row({ key: 7, state: "pick" }), // a binary awaiting the vault: no text
      ],
      storage,
      NOW,
    );
    const back = loadLedger(storage, NOW);
    for (const it of back.items) {
      assert.equal(it.state, "interrupted");
      assert.ok(it.reason, "the row says to drop it again");
      assert.equal(it.text, undefined);
    }
  });

  test("the dropped File itself never persists; a text-less binary pick comes back interrupted", () => {
    const storage = memory();
    const withFile = {
      ...row({ key: 8, state: "pick" as const }),
      file: new File(["bytes"], "recording.mp4"),
    };
    saveLedger([withFile], storage, NOW);
    const stored = (JSON.parse(storage.raw()) as { items: Record<string, unknown>[] })
      .items[0];
    assert.ok(!("file" in stored), Object.keys(stored).join(","));
    assert.equal(loadLedger(storage, NOW).items[0].state, "interrupted");
  });

  test("the ledger is per Chicago day: yesterday's rows do not come back", () => {
    const storage = memory();
    saveLedger([row({ key: 1, state: "filed" })], storage, NOW);
    const tomorrow = new Date(NOW.getTime() + 86_400_000);
    assert.notEqual(chicagoDay(NOW), chicagoDay(tomorrow));
    assert.deepEqual(loadLedger(storage, tomorrow), { items: [], maxKey: 0 });
  });
});

// ── D12 · what the ledger may keep (:285-287) ─────────────────────────────
describe("a settled row keeps the account, the counts, the day and the rung, never an address or body text", () => {
  const filed = row({
    key: 9,
    state: "filed" as const,
    text: "OUTLOOK THREAD — dropped file 9.eml\nFrom: dana@simploy.example\n\nthe board meets",
    why: "dana@simploy.example is Simploy's contact",
    rung: "email",
    account: { id: "S1", name: "Simploy" },
    filed: 3,
    opened: 2,
    asks: 1,
    learned: 1,
  });

  test("the stored JSON carries no address and no body text", () => {
    const storage = memory();
    saveLedger([filed], storage, NOW);
    assert.ok(!storage.raw().includes("@"), storage.raw());
    assert.ok(!storage.raw().includes("the board meets"));
    const back = loadLedger(storage, NOW).items[0];
    assert.equal(back.text, undefined);
    assert.equal(back.why, undefined);
  });

  test("the account, the counts, the day and the rung ride", () => {
    const storage = memory();
    saveLedger([filed], storage, NOW);
    const back = loadLedger(storage, NOW).items[0];
    assert.deepEqual(back.account, { id: "S1", name: "Simploy" });
    assert.equal(back.filed, 3);
    assert.equal(back.opened, 2);
    assert.equal(back.asks, 1);
    assert.equal(back.learned, 1);
    assert.equal(back.rung, "email");
    assert.equal((JSON.parse(storage.raw()) as { day: string }).day, chicagoDay(NOW));
  });

  test("every settled state drops its text and why", () => {
    for (const state of ["filed", "undone", "vaulted", "dupe", "error"] as const) {
      const s = storedRow(
        row({ key: 1, state, text: "body", why: "x@y.example is Acme's contact" }),
      );
      assert.equal(s.text, undefined, state);
      assert.equal(s.why, undefined, state);
    }
  });

  test("a row saved before the rung rode on it derives the rung from the router's why", () => {
    const cases: [string, string][] = [
      ["dana@simploy.example is Simploy's contact", "email"],
      ["simploy.example address in the text", "domain"],
      ["Chassie Smith is Simploy's contact", "person"],
      ["named in the text", "name"],
      ["“simploy” appears in the text", "head"],
      ["“ESC” matches the initials", "initials"],
      ["your call", "pick"],
      ["the rest of this drop went there", "batch"],
    ];
    for (const [why, rung] of cases)
      assert.equal(storedRow(row({ key: 1, state: "filed", why })).rung, rung, why);
  });

  test("a pick row still carries its text", () => {
    const s = storedRow(row({ key: 1, state: "pick", text: "From: a@b.example\n\nhi" }));
    assert.equal(s.text, "From: a@b.example\n\nhi");
  });
});

// ── D11 · a concurrency ceiling (:277) ────────────────────────────────────
describe("the Chute reads at most three files at once; the rest wait in drop order", () => {
  const tick = () => new Promise<void>((r) => setTimeout(r, 4));

  test("never more than three in flight, results in start order, all returned", async () => {
    let inFlight = 0;
    let peak = 0;
    const started: number[] = [];
    const finished: number[] = [];
    const tasks = Array.from({ length: 7 }, (_, i) => async () => {
      started.push(i);
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await tick();
      inFlight -= 1;
      finished.push(i);
      return i * 10;
    });
    const out = await runLimited(tasks, CHUTE_PARALLEL);
    assert.equal(peak, 3);
    assert.deepEqual(started, [0, 1, 2, 3, 4, 5, 6]);
    assert.deepEqual(finished, [0, 1, 2, 3, 4, 5, 6]);
    assert.deepEqual(out, [0, 10, 20, 30, 40, 50, 60]);
  });

  test("a limit past the task count runs them all at once; a limit of one is serial", async () => {
    let inFlight = 0;
    let peak = 0;
    const mk = (n: number) =>
      Array.from({ length: n }, (_, i) => async () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await tick();
        inFlight -= 1;
        return i;
      });
    await runLimited(mk(2), 5);
    assert.equal(peak, 2);
    peak = 0;
    await runLimited(mk(3), 1);
    assert.equal(peak, 1);
    assert.deepEqual(await runLimited([], 3), []);
  });
});

// ── D16 · "the same capture" (:288) ───────────────────────────────────────
describe("the same capture is the same normalized body, head line skipped", () => {
  const raw = [
    "From: Dana Ellis <dana@simploy.example>",
    "To: Antaeus Coe <acoe@prismhr.com>",
    "Subject: Re: Canada",
    "Date: Tue, 2 Sep 2026 09:44:00 -0500",
    "",
    "The board meets Thursday. Can you send the model?",
  ].join("\n");

  test("the same body under two filenames fingerprints equal", () => {
    assert.equal(
      pasteFingerprint(emlToPaste(raw, "thread.eml")),
      pasteFingerprint(emlToPaste(raw, "renamed (1).eml")),
    );
  });

  test("an .eml-shaped and an .msg-shaped head over one body fingerprint equal", () => {
    const body = "From: Dana\nSubject: Re: Canada\n\nThe board meets Thursday.";
    assert.equal(
      pasteFingerprint(`OUTLOOK THREAD — dropped file thread.eml\n${body}`),
      pasteFingerprint(`OUTLOOK THREAD — dropped file thread.msg\n${body}`),
    );
    const fields = {
      subject: "Re: Canada",
      senderName: "Dana",
      body: "The board meets.",
    };
    assert.equal(
      pasteFingerprint(msgToPaste(fields, "a.msg")),
      pasteFingerprint(msgToPaste(fields, "b.msg")),
    );
  });

  test("a bookmarklet re-copy with a fresh capture moment is the same thread", () => {
    const body = "\n\nDana Ellis\nThe board meets Thursday.";
    assert.equal(
      pasteFingerprint(`OUTLOOK THREAD - captured 9/25/2026, 10:00:00 AM${body}`),
      pasteFingerprint(`OUTLOOK THREAD - captured 9/25/2026, 11:30:00 AM${body}`),
    );
  });

  test("two different bodies differ, head or no head", () => {
    assert.notEqual(
      pasteFingerprint(
        "OUTLOOK THREAD — dropped file a.eml\n\nThe board meets Thursday.",
      ),
      pasteFingerprint("OUTLOOK THREAD — dropped file a.eml\n\nThe board meets Friday."),
    );
    assert.notEqual(
      pasteFingerprint("The board meets Thursday."),
      pasteFingerprint("The board meets Friday."),
    );
  });

  test("a first line that is not a producer's head still counts as body", () => {
    assert.notEqual(
      pasteFingerprint("From: Dana\n\nThe board meets Thursday."),
      pasteFingerprint("From: Sam\n\nThe board meets Thursday."),
    );
  });
});

// ── D2 · the Drop and the export (:281; ruled R12) ────────────────────────
describe("the Drop refuses a .csv and says where it goes", () => {
  const noPdf = async () => ({ ok: false as const, reason: "not here" });
  const csv = "Subject,Date,Assigned\nCall,9/2/2026,Antaeus Coe\nEmail,9/3/2026,Anika\n";
  const eml =
    "From: dana@simploy.example\nTo: acoe@prismhr.com\nSubject: Re: Canada\n\nThe board meets Thursday.";

  test("x.csv on the Drop is refused with a reason", async () => {
    const r = await readFileToText(new File([csv], "x.csv"), noPdf, { door: "drop" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.reason.length > 0);
  });

  test("x.eml on the Drop is read", async () => {
    const r = await readFileToText(new File([eml], "x.eml"), noPdf, { door: "drop" });
    assert.equal(r.ok, true);
    if (r.ok) assert.match(r.text, /^OUTLOOK THREAD/);
  });

  test("the Chute's own door still reads a .csv that is not the export", async () => {
    const r = await readFileToText(new File([csv], "x.csv"), noPdf, { door: "chute" });
    assert.equal(r.ok, true);
  });
});

// ── D1 · one Chute, one roster (:276; ruled R11) ──────────────────────────
describe("the Chute is one component with one roster wherever it mounts", () => {
  const roster = routingRoster();

  test("routingRoster() carries emails, domains, people and aka for every account", () => {
    assert.ok(roster.length > 0);
    for (const a of roster) {
      assert.ok(a.id && a.name);
      assert.ok(Array.isArray(a.emails));
      assert.ok(Array.isArray(a.domains));
      assert.ok(Array.isArray(a.people));
      assert.ok(Array.isArray(a.aka));
    }
    assert.ok(
      roster.some((a) => (a.people ?? []).length > 0),
      "someone carries a person",
    );
    assert.ok(
      roster.some((a) => (a.aka ?? []).length > 0),
      "someone carries an aka",
    );
  });

  test("the people rung routes a capture that only names a known person", () => {
    const bound = roster.find((a) => (a.people ?? []).length > 0)!;
    const person = bound
      .people![0].split(" ")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");
    const text = `CALL TRANSCRIPT — dropped file call.vtt\n${person}: Thanks for making time today.\nAntaeus Coe: Of course.`;
    const r = routeCapture(text, roster);
    assert.equal(r.best?.id, bound.id, r.candidates.map((c) => c.why).join(" | "));
    assert.equal(r.best?.rung, "person");
  });
});

// ── D30 · the mirror's query (:297-298, :283) ─────────────────────────────
describe("the intranet mirror's query excludes every namespaced row by construction", () => {
  // A tiny evaluator for the where the builder returns: NOT + contains /
  // startsWith on accountId. Anything else the builder starts emitting must
  // teach this evaluator first.
  type Where = { NOT?: Where; accountId?: { contains?: string; startsWith?: string } };
  const admits = (w: Where, id: string): boolean => {
    if (w.NOT) return !admits(w.NOT, id);
    const f = w.accountId ?? {};
    if (f.contains !== undefined && !id.includes(f.contains)) return false;
    if (f.startsWith !== undefined && !id.startsWith(f.startsWith)) return false;
    return true;
  };
  const where = recordRowsWhere() as Where;

  const namespaces = [
    GAP_NS,
    ACTIVITY_NS,
    GEMS_NS,
    SUPPORT_NS,
    INTENT_NS,
    STAGE_NS,
    WIRE_NS,
    INST_NS,
    SCRATCH_NS,
    SCRATCH_GONE_NS,
    PIPELINE_EDIT_NS,
    ACT_DRAFT_NS,
    SEAT_NS,
    RESEARCH_NS,
    SENDBOOK_NS,
    PRESENCE_NS,
  ];

  test("every namespace the app defines is excluded, and the predicate agrees", () => {
    for (const ns of namespaces) {
      const id = `${ns}001F000000w38BOIAY`;
      assert.equal(admits(where, id), false, ns);
      assert.equal(isNamespacedAccountId(id), true, ns);
    }
  });

  test("a plain account id is admitted — every account in the book", () => {
    assert.equal(admits(where, "001F000000w38BOIAY"), true);
    for (const p of peos) {
      assert.equal(admits(where, p.id), true, p.id);
      assert.equal(isNamespacedAccountId(p.id), false, p.id);
    }
  });
});
