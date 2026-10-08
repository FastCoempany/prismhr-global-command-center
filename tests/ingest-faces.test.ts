// The faces of the held file, the receipt and Send-it's hand-off (slice 18a
// of the Chute brains refactor plan; the face the founder approved with a
// ship order on 2026-10-06). One held box and one receipt line at every door:
// the Chute, the Drop, and the Intranet's Send-it through the Chute mounted
// on its page.
//
// Pinned as behavior wherever a seam exists: the components render through
// tests/helpers/room-render.ts (first paint, so an open state is asked for by
// prop), the ledger codec and the ✕'s plan are pure, the unfiled carriage is
// scripted through its doors and the wire. The server actions gate on the
// session and cannot be called from the suite, so their wiring is read from
// source, as tests/intranet-capture.test.ts reads the capture door.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import ts from "typescript";
import {
  handOffRow,
  loadLedger,
  saveLedger,
  seatHandOff,
  storedRow,
  type HandOff,
  type LedgerRow,
  type LedgerStorage,
} from "../src/app/room/chute-ledger";
import { DROP_CSV_RECEIPT, filingRequest } from "../src/app/room/ingest/use-ingest";
import { grabUndoRequest } from "../src/app/room/ingest/use-undo";
import { dismissHeld } from "../src/app/room/ingest/use-verdict";
import { UNFILED_FOLDER, archiveFileToGitHub } from "../src/lib/github/archive";
import { claimAccountId } from "../src/lib/ingest/guard";
import { UNFILED, sendUnfiled, type VaultDoors } from "../src/lib/ingest/vault";
import { ALREADY_FILING, ALREADY_ON_FILE, wroteFrom } from "../src/lib/ingest/wrote";
import { vaultAfterVerdict } from "../src/lib/room/drop-plan";
import { lintAct, lintReason } from "../src/lib/activity/lint";
import { HELD_LINE, heldLine, keptLine } from "../src/lib/intranet/capture-door";
import type { RouteAccount } from "../src/lib/route-capture";
import {
  chute,
  classesOf,
  held,
  receipt,
  render,
  roomClient,
  textOf,
} from "./helpers/room-render";

const root = cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const { HeldBox, HELD_X_TITLE, HELD_X_TITLE_BRAIN, NO_SURE_MATCH } = await held();
const { ReceiptLine, receiptCounts, rungWord } = await receipt();

const SIMPLOY = { id: "001F000000w38BOIAY", name: "Simploy" };
const REGIS = { id: "001F000000w38OHIAY", name: "Regis HR Group" };
const CORNERSTONE = {
  id: "001F000000w39CORNE",
  name: "Cornerstone Employer Solutions (dba SynchronyHR)",
};
const ADVOCATE = { id: "001F000000w38ADVPY", name: "Advocate Pay" };

const TEXT_VERDICT = {
  rung: "text" as const,
  reason: "Chassie Smith is Simploy's contact. Nothing points to Regis.",
  why: "chassie@simploy.com is Simploy's contact",
  boundWhy: "",
  claimId: SIMPLOY.id,
  candidates: [
    { id: SIMPLOY.id, name: SIMPLOY.name, rung: "email" },
    { id: REGIS.id, name: REGIS.name, rung: "head" },
  ],
};
const READ_VERDICT = {
  rung: "read" as const,
  reason: "Advocate Pay and Regis are separate PEOs.",
  why: "the read names Advocate Pay",
  boundWhy: "“regis” appears in the text",
  reasonBy: "model" as const,
  claimId: ADVOCATE.id,
  candidates: [],
};

const noop = () => {};
const heldBox = (props: Record<string, unknown>) =>
  render(
    createElement(HeldBox, {
      file: "simploy-renewal.eml",
      onPick: noop,
      onDismiss: noop,
      ...props,
    }),
  );
const receiptLine = (row: LedgerRow, props: Record<string, unknown> = {}) =>
  render(
    createElement(ReceiptLine, {
      row,
      canWrite: true,
      onTakeBack: noop,
      onClear: noop,
      ...props,
    }),
  );

/** The operator-facing copy of a render: its text and every title,
 *  placeholder and label the markup carries. */
const copyOf = (html: string): string =>
  [
    textOf(html),
    ...[...html.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)].map((m) =>
      m[1].replace(/&#x27;/g, "'").replace(/&amp;/g, "&"),
    ),
  ].join("\n");

const filed = (over: Partial<LedgerRow> = {}): LedgerRow => ({
  key: 1,
  filename: "regis-renewal.eml",
  state: "filed",
  account: REGIS,
  filed: 3,
  opened: 1,
  day: "10/6",
  rung: "email",
  noteIds: ["n1"],
  todoIds: ["t1"],
  filingId: "f1",
  ...over,
});

const memory = (): LedgerStorage & { raw: () => string } => {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    raw: () => [...m.values()].join("\n"),
  };
};

// ── the held file ───────────────────────────────────────────────────────────

describe("the held box: the kicker, the reason, the four choices, the grounds", () => {
  test("it shows the kicker and the file, the reason, and the four choices", async () => {
    const html = await heldBox({
      verdict: TEXT_VERDICT,
      claim: SIMPLOY.name,
      bound: REGIS,
      suggestion: CORNERSTONE,
    });
    const copy = textOf(html);
    assert.ok(classesOf(html).includes("heldPill"), "the amber kicker");
    assert.match(copy, /^Held simploy-renewal\.eml /, "the kicker, then the file");
    assert.ok(copy.includes(TEXT_VERDICT.reason), "the rung's reason, second");
    // The four choices, in the face's order: the solid best guess, the row it
    // was dropped on, the door to every other account, the ✕.
    const at = (s: string) => copy.indexOf(s);
    assert.ok(at("File to Simploy") > at(TEXT_VERDICT.reason));
    assert.ok(at("Keep on Regis HR Group") > at("File to Simploy"));
    assert.ok(at("Another account ▾") > at("Keep on Regis HR Group"));
    assert.match(
      html,
      /<button type="button" class="heldSolid"[^>]*>File to Simploy<\/button>/,
      "the guess is the solid ink button",
    );
    assert.match(html, /class="heldText"[^>]*>Keep on Regis HR Group</);
    assert.ok(
      html.includes(`title="Don&#x27;t file it. It still backs up."`),
      "the ✕'s title",
    );
    assert.equal(HELD_X_TITLE, "Don't file it. It still backs up.");
    assert.match(html, /class="heldX"[^>]*>✕<\/button>/);
    // Nothing deep surfaces uninvited: the grounds and the list wait shut.
    assert.match(html, /aria-expanded="false"[^>]*>Chassie Smith/);
    assert.ok(!copy.includes("In the text"));
    assert.ok(!copy.includes("Same batch"));
  });

  test("the reason opens to the grounds, each rung in plain words, then the row", async () => {
    const text = textOf(
      await heldBox({
        verdict: TEXT_VERDICT,
        claim: SIMPLOY.name,
        bound: REGIS,
        defaultOpen: "grounds",
      }),
    );
    assert.ok(
      text.includes("In the text chassie@simploy.com is the book's contact for Simploy."),
    );
    assert.ok(
      text.includes(
        "For Regis HR Group Nothing in the text names Regis HR Group or its people.",
      ),
    );
    // The read rung after the read: what the read said, the web check's own
    // reason in blue, and what the row carries for itself.
    const html = await heldBox({
      file: "call-oct-2.vtt",
      verdict: READ_VERDICT,
      claim: ADVOCATE.name,
      bound: REGIS,
      defaultOpen: "grounds",
    });
    const read = textOf(html);
    assert.ok(read.includes("From the read The read names Advocate Pay."));
    assert.ok(read.includes(`Web check ${READ_VERDICT.reason}`));
    assert.ok(read.includes("For Regis HR Group “regis” appears in the text."));
    assert.ok(
      classesOf(html).includes("heldKWeb"),
      "the model's line takes the system's blue",
    );
    assert.ok(read.includes("File to Advocate Pay"));
    // A reason the rule built is not called a web check.
    const rule = textOf(
      await heldBox({
        verdict: { ...READ_VERDICT, reasonBy: undefined },
        claim: ADVOCATE.name,
        bound: REGIS,
        defaultOpen: "grounds",
      }),
    );
    assert.ok(!rule.includes("Web check"));
  });

  test("another account opens to the candidates by rung, the row, the batch sibling as a suggestion, then the book", async () => {
    const html = await heldBox({
      verdict: TEXT_VERDICT,
      claim: SIMPLOY.name,
      bound: REGIS,
      suggestion: CORNERSTONE,
      defaultOpen: "others",
    });
    const copy = textOf(html);
    // Each account as a person says it; the book's full name rides the tooltip.
    const order = [
      "Simploy Address",
      "Regis HR Group Dropped here",
      "Cornerstone Employer Solutions Same batch",
    ];
    for (const s of order) assert.ok(copy.includes(s), s);
    assert.ok(
      copy.indexOf(order[0]) < copy.indexOf(order[1]) &&
        copy.indexOf(order[1]) < copy.indexOf(order[2]),
    );
    assert.ok(
      html.includes('placeholder="Search the book…"'),
      "the search of the book comes last",
    );
    assert.ok(
      html.includes('title="A suggestion. The rest of this drop filed there."'),
      "the sibling is marked a suggestion, never a rung (D5)",
    );
  });

  test("the waiting row with no sure match is the same box, with that sentence and nothing more", async () => {
    const html = await heldBox({
      file: "notes.txt",
      verdict: null,
      say: NO_SURE_MATCH,
      candidates: [],
    });
    const copy = textOf(html);
    assert.match(copy, /^Held notes\.txt No sure match\. Pick the account\. /);
    assert.ok(!/WHY/.test(copy), "no reason to open");
    assert.ok(!copy.includes("Keep on"), "no row to keep it on");
    assert.ok(copy.includes("Pick the account ▾"));
    assert.ok(html.includes(`title="Don&#x27;t file it. It still backs up."`));
  });

  test("the solid button files only to an account the book holds by that name", () => {
    const roster: RouteAccount[] = [
      { id: SIMPLOY.id, name: "Simploy, Inc.", emails: [], domains: [] },
      {
        id: CORNERSTONE.id,
        name: CORNERSTONE.name,
        emails: [],
        domains: [],
        aka: ["SynchronyHR"],
      },
    ];
    assert.equal(
      claimAccountId("Simploy", roster),
      SIMPLOY.id,
      "said the way a person says it",
    );
    assert.equal(
      claimAccountId("SynchronyHR", roster),
      CORNERSTONE.id,
      "by a name the book also knows",
    );
    assert.equal(
      claimAccountId("Simple Everest", roster),
      undefined,
      "a PEO's client is no account",
    );
    assert.equal(
      claimAccountId("Simploy", roster, SIMPLOY.id),
      undefined,
      "the row itself is the other button",
    );
    assert.equal(claimAccountId("Sim", roster), undefined, "never a loose match");
  });

  test("a read-only session sees the hold and no choices", async () => {
    const copy = textOf(
      await heldBox({
        verdict: TEXT_VERDICT,
        claim: SIMPLOY.name,
        bound: REGIS,
        canWrite: false,
      }),
    );
    assert.ok(copy.includes(TEXT_VERDICT.reason));
    assert.ok(
      !copy.includes("File to") && !copy.includes("Keep on") && !copy.includes("✕"),
    );
  });
});

// ── the receipt ─────────────────────────────────────────────────────────────

describe("the receipt line: the account, the counts, the day, the rung", () => {
  test("a filing's line carries exactly the account, each count, the day and the rung", async () => {
    const html = await receiptLine(filed({ promises: 1, asks: 2, learned: 1 }));
    assert.equal(
      textOf(html),
      // "1 their promise" became plain words in pass 9 (pass 8, C6).
      "✓ Regis HR Group · 3 filed · 1 to-do · 1 promise from them · 2 asks · 1 to the playbook · 10/6 · address ↺ ✕",
    );
    // The account is a plain link, no glyph beside it.
    assert.match(
      html,
      /<a class="rcptAcct" href="\/accounts\?focus=001F000000w38OHIAY">Regis HR Group<\/a>/,
    );
    assert.ok(!html.includes("↗"));
    // A count that is zero is left out.
    assert.equal(
      textOf(
        await receiptLine(
          filed({ account: ADVOCATE, filed: 4, opened: 0, rung: "domain" }),
          { onTakeBack: undefined, onClear: undefined },
        ),
      ),
      "✓ Advocate Pay · 4 filed · 10/6 · domain",
    );
  });

  test("the rung reads in plain words, and the door and the reader never show", async () => {
    const words = Object.fromEntries(
      [
        "email",
        "domain",
        "person",
        "name",
        "head",
        "initials",
        "pick",
        "batch",
        "other",
        "",
      ].map((r) => [r, rungWord(r)]),
    );
    assert.deepEqual(words, {
      email: "address",
      domain: "domain",
      person: "person",
      name: "name",
      head: "name",
      initials: "name",
      pick: "picked",
      batch: "picked",
      other: "",
      "": "",
    });
    const copy = copyOf(await receiptLine(filed({ rung: "pick", archived: true })));
    assert.ok(copy.includes("· picked"));
    assert.ok(
      !/\b(chute|drop|intranet|claude|rules|transcript|read by)\b/i.test(
        textOf(await receiptLine(filed())),
      ),
      "no door, no reader",
    );
  });

  test("the other receipts read as the face draws them", async () => {
    const line = async (row: Partial<LedgerRow>) =>
      textOf(
        await receiptLine({ key: 2, filename: "", state: "filed", ...row } as LedgerRow),
      );
    assert.equal(
      await line({
        state: "vaulted",
        filename: "board-deck.pdf",
        account: SIMPLOY,
        day: "10/6",
        vault: {
          text: "accounts/Simploy/board-deck.pdf",
          url: "https://github.com/o/vault/blob/main/accounts/Simploy/board-deck.pdf",
        },
      }),
      "⇪ Backed up · board-deck.pdf · 10/6 · open ✕",
    );
    assert.equal(
      await line({ state: "unfiled", filename: "stray-scan.pdf", day: "10/6" }),
      "⇪ Not filed. Backed up. · stray-scan.pdf · 10/6 ✕",
    );
    assert.equal(
      await line({
        state: "undone",
        reason: "Taken back from Regis HR Group. 3 removed.",
      }),
      "↺ Taken back from Regis HR Group. 3 removed. ✕",
    );
    assert.equal(
      await line({ state: "kept", filename: "Send-it paste", day: "10/6" }),
      "Not filed. Kept in the brain. · Send-it paste · 10/6 ✕",
    );
  });

  test("the line opens in place to what the filing wrote", async () => {
    const at = new Date("2026-10-03T12:00:00Z");
    const wrote = wroteFrom(
      [
        { body: "✉ OL 10/3 9:14 AM — Re: renewal timing · Lesha Cyphers", createdAt: at },
        {
          body: "☰ Call transcript — Pricing call · 2 voices · full text under the fold\nA: hi",
          createdAt: new Date("2026-10-06T12:00:00Z"),
        },
      ],
      [
        { body: "Send the census template.\n⚑[d:2026-10-08,k:a]" },
        {
          body: "Send the plan summary.\n⚑[d:2026-10-10,o:them,h:Antaeus Coe,b:Lesha Cyphers]",
        },
      ],
    );
    assert.deepEqual(wrote, {
      filed: [
        "Re: renewal timing · Lesha Cyphers · 10/3",
        "Call transcript · Pricing call · 2 voices · 10/6",
      ],
      todos: ["Send the census template."],
      promises: ["Lesha Cyphers · Send the plan summary."],
      // The asks and the playbook lines open too since pass 9 (pass 8 call
      // 9); this filing wrote none.
      asks: [],
      learned: [],
    });
    const html = await receiptLine(
      filed({
        vault: {
          text: "accounts/Regis HR Group/regis-renewal.eml",
          url: "https://github.com/o/vault/x",
        },
      }),
      { defaultOpen: true, wrote },
    );
    const copy = textOf(html);
    assert.match(html, /aria-expanded="true"/);
    for (const s of [
      "File regis-renewal.eml · Backed up · open",
      "Filed Re: renewal timing",
      "To-do Send the census template.",
      "Their promise Lesha Cyphers · Send the plan summary.",
    ])
      assert.ok(copy.includes(s), s);
    // Shut, nothing of it shows.
    assert.ok(
      !textOf(await receiptLine(filed(), { wrote })).includes(
        "Send the census template.",
      ),
    );
  });

  // Pass 9's tail (D11): "The Chute reads three files at once; the rest wait
  // in drop order and say so." A file waiting its turn read "Reading…" like
  // the three in flight; it says it is waiting now, with its place.
  test("a file waiting its turn says so with its place; Reading… is only for the reads in flight", async () => {
    const queued = { key: 9, filename: "x.pdf", state: "queued" as const };
    assert.equal(
      textOf(await receiptLine(queued, { ahead: 0, onClear: undefined })),
      "x.pdf · Waiting · next in line",
    );
    assert.equal(
      textOf(await receiptLine(queued, { ahead: 2, onClear: undefined })),
      "x.pdf · Waiting · 2 ahead",
    );
    assert.ok(!textOf(await receiptLine(queued, { ahead: 1 })).includes("Reading"));
    // The waiting row is in flight: no ✕, no ↺, nothing to clear yet.
    assert.ok(!/✕|↺/.test(textOf(await receiptLine(queued, { ahead: 1 }))));
    assert.equal(
      textOf(await receiptLine({ key: 9, filename: "x.pdf", state: "reading" })),
      "x.pdf · Reading…",
    );
  });
});

describe("the second line speaks only when something needs saying", () => {
  test("each caveat appears only when its condition holds", async () => {
    const caveat = async (over: Partial<LedgerRow>) => {
      const html = await receiptLine(filed(over));
      const m = /<p class="rcptCaveat">([^<]*)<\/p>/.exec(html);
      return m ? m[1].replace(/&#x27;/g, "'") : null;
    };
    assert.equal(await caveat({}), null, "a clean filing has one line");
    assert.equal(await caveat({ windows: [], dupeCheck: "ran", degraded: false }), null);
    assert.equal(
      await caveat({ windows: [{ what: "the paste", read: 60000, of: 212000 }] }),
      "Read 60,000 of 212,000 characters.",
    );
    assert.equal(
      await caveat({ dupeCheck: "skipped" }),
      "The duplicate check didn't run.",
    );
    assert.equal(
      await caveat({ degraded: true }),
      "The reader was down. Only the text filed.",
    );
    assert.equal(
      await caveat({
        windows: [{ what: "the paste", read: 60000, of: 212000 }],
        dupeCheck: "skipped",
        degraded: true,
      }),
      "Read 60,000 of 212,000 characters. The duplicate check didn't run. The reader was down. Only the text filed.",
    );
  });

  test("the refused export keeps its decreed line as the amber second line", async () => {
    const html = await receiptLine({
      key: 3,
      filename: "activity-export-oct-6.csv",
      state: "vaulted",
      account: REGIS,
      day: "10/6",
      vault: {
        text: "accounts/Regis HR Group/activity-export-oct-6.csv",
        url: "https://github.com/o/vault/y",
      },
      note: DROP_CSV_RECEIPT,
    });
    // The backup's "open" door rides this line again (pass 8, C5): the
    // decreed note took it away in #360.
    assert.equal(
      textOf(html),
      "⇪ activity-export-oct-6.csv · 10/6 · open ✕ Not filed here. Backed up. Drop the export in the Chute.",
    );
    assert.match(
      html,
      /<a href="https:\/\/github\.com\/o\/vault\/y" target="_blank" rel="noreferrer">open<\/a>/,
    );
    assert.match(
      html,
      /<p class="rcptCaveat">Not filed here\. Backed up\. Drop the export in the Chute\.<\/p>/,
    );
  });
});

describe("no address on a settled row (D12), and no ↺ in a read-only session (D29)", () => {
  const row = filed({
    account: SIMPLOY,
    why: "dana@simploy.example is Simploy's contact",
    text: "OUTLOOK THREAD\nFrom: dana@simploy.example\n\nthe board meets",
    verdict: {
      rung: "text",
      why: "dana@simploy.example is Simploy's contact",
      reason: "Simploy's contact address is in the text.",
    },
  });

  test("no address renders on a settled receipt, shut or open", async () => {
    const wrote = wroteFrom(
      [
        {
          body: "✉ OL 10/3 9:14 AM — Board pack from dana@simploy.example · Dana Lee <dana@simploy.example>",
          createdAt: new Date("2026-10-03T12:00:00Z"),
        },
      ],
      [{ body: "Write back to dana@simploy.example.\n⚑[k:a]" }],
    );
    for (const html of [
      await receiptLine(row),
      await receiptLine(row, { defaultOpen: true, wrote }),
    ]) {
      assert.ok(!html.includes("@"), html);
      assert.ok(!html.includes("the board meets"), "no body text");
    }
    assert.ok(
      textOf(await receiptLine(row, { defaultOpen: true, wrote })).includes(
        "Board pack from · Dana Lee · 10/3",
      ),
    );
  });

  test("the ledger keeps a held row's grounds and drops them the moment it settles", () => {
    const stored = storedRow(row);
    assert.equal(stored.verdict, undefined);
    assert.equal(stored.why, undefined);
    assert.equal(stored.text, undefined);
    assert.equal(stored.day, "10/6", "the day rides");
    const storage = memory();
    saveLedger([row], storage, new Date("2026-10-06T15:00:00Z"));
    assert.ok(!storage.raw().includes("@"), storage.raw());
    // A live hold keeps them across a reload (C20).
    const waiting = storedRow({ ...row, state: "mismatch" });
    assert.equal(waiting.verdict?.why, "dana@simploy.example is Simploy's contact");
    assert.ok(waiting.text);
  });

  test("↺ is absent in a read-only session", async () => {
    const live = await receiptLine(row);
    assert.ok(live.includes('title="Take back everything this filing wrote"'));
    assert.ok(textOf(live).includes("↺"));
    const ro = await receiptLine(row, { canWrite: false });
    assert.ok(!ro.includes("Take back everything this filing wrote"));
    assert.ok(!textOf(ro).includes("↺"));
    assert.ok(
      textOf(ro).startsWith("✓ Simploy · 3 filed"),
      "the receipt itself still shows",
    );
  });
});

// ── the ✕ ───────────────────────────────────────────────────────────────────

describe("the ✕ files nothing and still backs the file up", () => {
  test("✕ on a held file produces an unfiled vault request and the Not filed. Backed up. receipt", async () => {
    const f = new File(["%PDF-1.7"], "stray-scan.pdf", { type: "application/pdf" });
    const plan = dismissHeld({ filename: f.name, text: "the scan's text", files: [f] });
    assert.deepEqual(
      plan,
      { kind: "vault", files: [f] },
      "the dropped file itself backs up",
    );
    // Through the server's own doors, in the unfiled mode: no account named.
    const asked: string[] = [];
    const doors: VaultDoors = {
      whole: async (accountId, form) => {
        asked.push(accountId);
        assert.equal((form.get("file") as File).name, "stray-scan.pdf");
        return {
          ok: true,
          kind: "file",
          url: "https://github.com/o/vault/blob/main/accounts/_unfiled/stray-scan.pdf",
          detail: "accounts/_unfiled/stray-scan.pdf",
        };
      },
      piece: async () => {
        throw new Error("a small file never goes in pieces");
      },
    };
    const r = await sendUnfiled(f, doors);
    assert.deepEqual(asked, [UNFILED]);
    assert.ok(r.ok);
    // And the server half lands it under accounts/_unfiled/.
    const real = globalThis.fetch;
    const urls: string[] = [];
    globalThis.fetch = (async (url: unknown, init?: { method?: string }) => {
      urls.push(`${init?.method ?? "GET"} ${String(url)}`);
      const put = init?.method === "PUT";
      return {
        ok: put,
        status: put ? 201 : 404,
        json: async () =>
          put ? { content: { html_url: "https://github.com/o/vault/u" } } : {},
      };
    }) as unknown as typeof fetch;
    try {
      const landed = await archiveFileToGitHub({
        file: f,
        accountName: null,
        grant: { repo: "o/vault", token: "t" },
      });
      assert.deepEqual(landed, {
        ok: true,
        kind: "file",
        url: "https://github.com/o/vault/u",
        detail: `accounts/${UNFILED_FOLDER}/stray-scan.pdf`,
      });
      assert.deepEqual(urls, [
        "GET https://api.github.com/repos/o/vault/contents/accounts/_unfiled/stray-scan.pdf",
        "PUT https://api.github.com/repos/o/vault/contents/accounts/_unfiled/stray-scan.pdf",
      ]);
    } finally {
      globalThis.fetch = real;
    }
    // The receipt.
    assert.equal(
      textOf(
        await receiptLine({ key: 4, filename: f.name, state: "unfiled", day: "10/6" }),
      ),
      "⇪ Not filed. Backed up. · stray-scan.pdf · 10/6 ✕",
    );
    // A reload took the file and kept the text (C20): the text backs up.
    const after = dismissHeld({ filename: "call.vtt", text: "WEBVTT\n\nA: hi" });
    assert.equal(after.kind, "vault");
    if (after.kind === "vault") assert.equal(after.files[0].name, "call.vtt.txt");
    // Both doors send it this way; the gate binds no account for it.
    for (const face of ["src/app/room/chute.tsx", "src/app/room/room-client.tsx"]) {
      const src = read(face);
      assert.ok(
        src.includes("ingest.vaultUnfiled("),
        `${face} backs the held file up unfiled`,
      );
      assert.ok(src.includes('state: "unfiled"'), `${face} says Not filed. Backed up.`);
    }
    assert.match(
      read("src/app/room/vault-actions.ts"),
      /const unfiled = accountId === UNFILED;/,
    );
    // The Drop's old "keep it out ✕" and "No — it's X's ✓" are gone into the box.
    const client = read("src/app/room/room-client.tsx");
    assert.ok(!client.includes("keep it out ✕") && !client.includes("No — it's"));
  });

  test("the Intranet ✕ keeps the capture in the brain", async () => {
    const text =
      "OUTLOOK THREAD — Brazil hires\nFrom: someone at a client\n\nTwelve people in Brazil by January.";
    assert.deepEqual(dismissHeld({ door: "intranet", filename: "Send-it paste", text }), {
      kind: "keep",
      text,
    });
    assert.deepEqual(
      dismissHeld({ door: "intranet", filename: "Send-it paste", text: "" }),
      { kind: "none" },
    );
    // The box says so on its ✕.
    const html = await heldBox({
      file: "Send-it paste",
      verdict: TEXT_VERDICT,
      claim: SIMPLOY.name,
      bound: REGIS,
      dismissTitle: HELD_X_TITLE_BRAIN,
    });
    assert.ok(html.includes(`title="Don&#x27;t file it. It stays in the brain."`));
    // The Chute sends it down the brain's road, never to the vault.
    const chute = read("src/app/room/chute.tsx");
    assert.match(
      chute,
      /import \{ intranetKeep \} from "\.\.\/intranet\/capture-actions";/,
    );
    assert.match(chute, /const r = await intranetKeep\(plan\.text\);/);
    assert.match(
      chute,
      /dismissTitle=\{it\.door === "intranet" \? HELD_X_TITLE_BRAIN : HELD_X_TITLE\}/,
    );
    // The keep road skips the route and the pipeline and reaches the doc write.
    const door = read("src/app/intranet/capture-actions.ts");
    assert.match(
      door,
      /export async function intranetKeep\(raw: string\): Promise<CaptureReply> \{\s*return intranetCapture\(raw, undefined, \{ keep: true \}\);/,
    );
    const capture = door.slice(door.indexOf("export async function intranetCapture("));
    const gate = capture.indexOf("if (!opts?.keep) {");
    const route = capture.indexOf("captureVerdict(await routeText(text))");
    const paste = capture.indexOf("await roomPaste(");
    const doc = capture.indexOf("prisma.intranetDoc.create(");
    assert.ok(
      gate > 0 && gate < route && route < paste && paste < doc,
      "keep jumps the route and the pipeline",
    );
    assert.equal(keptLine(), "Kept in the brain.");
    assert.equal(
      textOf(
        await receiptLine({
          key: 5,
          filename: "Send-it paste",
          state: "kept",
          day: "10/6",
        }),
      ),
      "Not filed. Kept in the brain. · Send-it paste · 10/6 ✕",
    );
  });
});

// ── Send-it's hand-off ──────────────────────────────────────────────────────

describe("Send-it hands a disputed capture to the Chute above", () => {
  const handOff: HandOff = {
    filename: "Send-it paste",
    text: "OUTLOOK THREAD — renewal\nFrom: Chassie Smith\n\nThe renewal is on the 14th.",
    account: REGIS,
    claim: SIMPLOY.name,
    verdict: TEXT_VERDICT,
    door: "intranet",
  };

  test("Send-it's disputed line is Held in the Chute above.", () => {
    assert.equal(HELD_LINE, "Held in the Chute above.");
    assert.equal(heldLine(), HELD_LINE);
    // The client hands the held capture over before its line lands, and the
    // line is the reply's receipt, the same seat a filed capture's takes.
    const client = read("src/app/intranet/intranet-client.tsx");
    const hand = client.indexOf("if (r.held)");
    const line = client.indexOf("if (!r.captureId) {");
    assert.ok(hand > 0 && hand < line, "the hand-off comes first");
    assert.match(
      client.slice(hand, line),
      /handToChute\(\{[\s\S]*?filename: SEND_IT_LABEL,[\s\S]*?text: sent,[\s\S]*?door: "intranet",/,
    );
    assert.match(client.slice(line), /lines: \[r\.receipt\]/);
  });

  test("the capture waits in the Chute as a held row, through a reload, and its pick files with the intranet door", () => {
    const row = handOffRow(handOff, 7);
    assert.equal(row.state, "mismatch");
    assert.equal(row.door, "intranet");
    assert.equal(row.reason, TEXT_VERDICT.reason);
    // With no Chute listening it is seated in the stored ledger and comes
    // back held, with its text and its grounds (C20).
    const storage = memory();
    const now = new Date("2026-10-06T15:00:00Z");
    saveLedger([filed()], storage, now);
    seatHandOff(handOff, storage, now);
    const back = loadLedger(storage, now).items;
    assert.equal(back.length, 2);
    assert.equal(back[0].state, "mismatch");
    assert.equal(back[0].key, 2, "a fresh key above the stored ones");
    assert.equal(back[0].text, handOff.text);
    assert.equal(back[0].verdict?.claimId, SIMPLOY.id);
    assert.equal(back[0].door, "intranet");
    // The pick files through roomPaste with the door it came through (P3).
    const [, , opts] = filingRequest("intranet", SIMPLOY.id, handOff.text, {
      force: true,
    });
    assert.equal(opts?.door, "intranet");
    assert.equal(opts?.force, true);
    assert.match(read("src/app/room/chute.tsx"), /it\.windows,\s*it\.door,/);
    // The Chute's ledger takes the hand-off event and marks it taken.
    const hook = read("src/app/room/ingest/use-receipts.ts");
    assert.match(hook, /window\.addEventListener\(HAND_OFF_EVENT, take\)/);
    assert.match(hook, /d\.taken = true;/);
  });
});

describe("Send-it hands an unsure capture to the Chute above, as a dispute (ordered 2026-10-06)", () => {
  // One box holds a disputed or unsure file at every door (CLAUDE.md, The
  // held file and the receipt). An unsure capture arrives as a pick row: no
  // verdict, the route's candidates, the intranet door.
  const unsure: HandOff = {
    filename: "Send-it paste",
    text: "From: ops@simploy.com\nTo: team@regishrgroup.com\n\nThread about the handover.",
    candidates: [
      { id: REGIS.id, name: REGIS.name, rung: "domain" },
      { id: SIMPLOY.id, name: SIMPLOY.name, rung: "domain" },
    ],
    door: "intranet",
  };

  test("the held box says No sure match and offers the candidates as its choices", async () => {
    const row = handOffRow(unsure, 8);
    assert.equal(row.state, "pick");
    // Painted the way the Chute paints a waiting row with text and no verdict.
    const html = await heldBox({
      file: row.filename,
      verdict: null,
      say: NO_SURE_MATCH,
      candidates: row.candidates,
      dismissTitle: HELD_X_TITLE_BRAIN,
      defaultOpen: "others",
    });
    const copy = textOf(html);
    assert.match(copy, /^Held Send-it paste No sure match\. Pick the account\. /);
    assert.ok(!/WHY/.test(copy), "nothing disputed it, so no grounds to open");
    assert.ok(!copy.includes("Keep on"), "no row to keep it on");
    assert.ok(
      copy.includes("File to Regis HR Group"),
      "the strongest candidate is the solid button",
    );
    assert.ok(copy.includes("Another account ▴"));
    assert.ok(copy.includes("Simploy Domain"), "the other candidate, by its rung");
    assert.ok(
      html.includes(`placeholder="Search the book…"`),
      "then a search of the book",
    );
    assert.ok(html.includes(`title="Don&#x27;t file it. It stays in the brain."`));
    // The Chute hands a waiting row's own candidates to the box, with no
    // verdict and no row to keep it on, and the ✕'s title by its door.
    const chute = read("src/app/room/chute.tsx");
    assert.match(
      chute,
      /verdict=\{it\.state === "mismatch" \? \(it\.verdict \?\? \{ reason: it\.reason \}\) : null\}/,
    );
    assert.match(chute, /say=\{it\.text \? NO_SURE_MATCH : VAULT_PICK\}/);
    assert.match(
      chute,
      /\(it\.candidates \?\? \[\]\)\.map\(\(c\) => \(\{ id: c\.id, name: c\.name, rung: c\.rung \}\)\)/,
    );
  });

  test("its pick files with the intranet door and its ✕ keeps it in the brain", () => {
    const row = handOffRow(unsure, 9);
    const [, , opts] = filingRequest("intranet", REGIS.id, unsure.text, { force: true });
    assert.equal(opts?.door, "intranet");
    assert.equal(row.door, "intranet");
    assert.match(read("src/app/room/chute.tsx"), /it\.windows,\s*it\.door,/);
    assert.deepEqual(
      dismissHeld({ door: row.door, filename: row.filename, text: row.text }),
      {
        kind: "keep",
        text: unsure.text,
      },
    );
  });
});

// ── the writing canon ───────────────────────────────────────────────────────

describe("the faces' copy obeys the writing canon", () => {
  test("no operator string in these components carries an em-dash, a parenthetical or the word steps", async () => {
    // Every face the components paint, open and shut.
    const renders = [
      await heldBox({
        verdict: TEXT_VERDICT,
        claim: SIMPLOY.name,
        bound: REGIS,
        suggestion: CORNERSTONE,
        defaultOpen: "grounds",
      }),
      await heldBox({
        verdict: TEXT_VERDICT,
        claim: SIMPLOY.name,
        bound: REGIS,
        suggestion: CORNERSTONE,
        defaultOpen: "others",
      }),
      await heldBox({
        file: "call.vtt",
        verdict: READ_VERDICT,
        claim: ADVOCATE.name,
        bound: REGIS,
        defaultOpen: "grounds",
      }),
      await heldBox({
        file: "rec.mp4",
        verdict: null,
        say: "A file the reader can't open. Pick its account for the vault.",
      }),
      await heldBox({
        file: "Send-it paste",
        verdict: TEXT_VERDICT,
        claim: SIMPLOY.name,
        bound: REGIS,
        dismissTitle: HELD_X_TITLE_BRAIN,
      }),
      await heldBox({
        file: "Send-it paste",
        verdict: null,
        say: NO_SURE_MATCH,
        candidates: [{ id: REGIS.id, name: REGIS.name, rung: "domain" }],
        dismissTitle: HELD_X_TITLE_BRAIN,
        defaultOpen: "others",
      }),
      await receiptLine(
        filed({
          promises: 2,
          asks: 1,
          learned: 1,
          windows: [{ what: "the paste", read: 60000, of: 212000 }],
          dupeCheck: "skipped",
          degraded: true,
        }),
      ),
      await receiptLine(filed(), {
        defaultOpen: true,
        wrote: {
          filed: ["Re: renewal · Lesha Cyphers · 10/3"],
          todos: ["Send the census template."],
          promises: [],
        },
      }),
      await receiptLine(filed({ filingId: undefined }), { defaultOpen: true }),
      await receiptLine({
        key: 9,
        filename: "x.pdf",
        state: "vaulted",
        account: REGIS,
        day: "10/6",
        vault: { text: "accounts/Regis HR Group/x.pdf", url: "https://github.com/o/v" },
      }),
      await receiptLine({ key: 9, filename: "x.pdf", state: "unfiled", day: "10/6" }),
      await receiptLine({ key: 9, filename: "x.pdf", state: "kept", day: "10/6" }),
      await receiptLine({ key: 9, filename: "x.pdf", state: "filing", account: REGIS }),
      await receiptLine({ key: 9, filename: "x.pdf", state: "reading" }),
      await receiptLine({ key: 9, filename: "x.pdf", state: "queued" }, { ahead: 0 }),
      await receiptLine({ key: 9, filename: "x.pdf", state: "queued" }, { ahead: 2 }),
      await receiptLine({
        key: 9,
        filename: "x.pdf",
        state: "filed",
        account: REGIS,
        vault: { text: "Backing up x.pdf… 1 of 3", going: true },
      }),
    ];
    for (const html of renders) {
      const copy = copyOf(html);
      assert.ok(!copy.includes("—"), `an em-dash: ${copy}`);
      assert.ok(!/\([^)]*\)/.test(copy), `a parenthetical: ${copy}`);
      assert.ok(!/\bsteps?\b/i.test(copy), `the word steps: ${copy}`);
    }
    // And every string the two components and the hand-off spell, read from
    // their source with the comments gone.
    for (const f of [
      "src/app/room/ingest/held.tsx",
      "src/app/room/ingest/receipt.tsx",
      "src/app/room/ingest/hand-off.ts",
    ]) {
      const code = read(f)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
      const literals = [
        ...code.matchAll(
          /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g,
        ),
      ].map((m) => (m[1] ?? m[2] ?? m[3] ?? "").replace(/\$\{[^}]*\}/g, ""));
      for (const s of literals) {
        assert.ok(!s.includes("—"), `${f}: an em-dash in "${s}"`);
        assert.ok(!/\bsteps?\b/i.test(s), `${f}: the word steps in "${s}"`);
        if (/\s/.test(s))
          assert.ok(!/\([^)]*\)/.test(s), `${f}: a parenthetical in "${s}"`);
      }
    }
  });
});

// ── pass 9: every count opens, and every settled line has its door ─────────
// Pass 8 found the receipt counting asks and playbook lines it never opened
// to (C1, ruled 2026-10-07 call 9), the duplicate, the take-back and the
// refused export's lines opening to nothing (C2, C5), a filing that failed
// leaving its file out of git (call 8), and copy that broke the canon (C3,
// C4, C6, B48).

describe("the receipt opens every count it shows (pass 8 call 9, C1)", () => {
  test("the asks and the playbook lines open under their own kickers, in the line's order", async () => {
    const wrote = wroteFrom(
      [
        {
          body: "✉ OL 10/3 9:14 AM — Re: renewal timing · Lesha Cyphers",
          createdAt: new Date("2026-10-03T12:00:00Z"),
        },
      ],
      [{ body: "Send the census template.\n⚑[d:2026-10-08,k:a]" }],
      {
        asks: [
          "Which countries are first?",
          "Who signs for the client at lesha@regis.example?",
        ],
        learned: ["At Remote, a deposit was required."],
      },
    );
    assert.deepEqual(wrote.asks, [
      "Which countries are first?",
      "Who signs for the client at ?",
    ]);
    assert.deepEqual(wrote.learned, ["At Remote, a deposit was required."]);
    const row = filed({ asks: 2, learned: 1 });
    const html = await receiptLine(row, { defaultOpen: true, wrote });
    const copy = textOf(html);
    assert.ok(copy.includes("2 asks · 1 to the playbook"), "the line counts them");
    for (const s of [
      "Asks Which countries are first?",
      "To the playbook At Remote, a deposit was required.",
    ])
      assert.ok(copy.includes(s), s);
    const at = (k: string) => copy.indexOf(k);
    assert.ok(
      at("To-do Send") < at("Asks Which") && at("Asks Which") < at("To the playbook At"),
      "the line's order",
    );
    assert.ok(!html.includes("@"), "no address on a settled row (D12)");
    // One ask reads under the singular kicker.
    const one = textOf(
      await receiptLine(filed({ asks: 1 }), {
        defaultOpen: true,
        wrote: { ...wrote, asks: ["Which countries are first?"], learned: [] },
      }),
    );
    assert.ok(one.includes("Ask Which countries are first?"));
  });

  test("every count on the line has its list when the filing wrote it", async () => {
    const wrote = wroteFrom(
      [
        {
          body: "✉ OL 10/3 9:14 AM — Re: renewal · Lesha Cyphers",
          createdAt: new Date("2026-10-03T12:00:00Z"),
        },
      ],
      [
        { body: "Send the census.\n⚑[k:a]" },
        { body: "Send the plan.\n⚑[o:them,b:Lesha Cyphers]" },
      ],
      { asks: ["Which countries are first?"], learned: ["Deposits run a month."] },
    );
    const row = filed({ filed: 1, opened: 1, promises: 1, asks: 1, learned: 1 });
    const copy = textOf(await receiptLine(row, { defaultOpen: true, wrote }));
    const kicker: Record<string, string> = {
      filed: "Filed",
      "to-do": "To-do",
      "promise from them": "Their promise",
      ask: "Ask",
      "to the playbook": "To the playbook",
    };
    for (const count of receiptCounts(row)) {
      const kind = count.replace(/^\d+\s+/, "");
      assert.ok(kicker[kind], `a count with no kicker: ${count}`);
      assert.ok(copy.includes(`${kicker[kind]} `), `${count} opens to nothing`);
    }
  });
});

describe("a duplicate opens to the earlier filing (pass 8, C2)", () => {
  const dupe = (over: Partial<LedgerRow> = {}): LedgerRow => ({
    key: 4,
    filename: "regis-renewal.eml",
    state: "dupe",
    account: REGIS,
    reason: ALREADY_ON_FILE,
    prior: { day: "10/3", filingId: "f0" },
    day: "10/6",
    ...over,
  });

  test("the decree's line verbatim, the account it is on file under, and the day that opens", async () => {
    assert.equal(ALREADY_ON_FILE, "Already on file. Nothing filed twice.");
    const html = await receiptLine(dupe(), { onTakeBack: undefined });
    assert.equal(
      textOf(html),
      "regis-renewal.eml · Already on file. Nothing filed twice. · Regis HR Group · Filed 10/3 ✕",
    );
    assert.match(
      html,
      /<a class="rcptAcct" href="\/accounts\?focus=001F000000w38OHIAY">Regis HR Group<\/a>/,
    );
    assert.match(
      html,
      /<button type="button" class="rcptOpen" aria-expanded="false" title="Show what the earlier filing wrote">Filed 10\/3<\/button>/,
    );
    assert.ok(!html.includes("Take back"), "a duplicate has nothing to take back");
    const wrote = wroteFrom(
      [
        {
          body: "✉ OL 10/3 9:14 AM — Re: renewal timing · Lesha Cyphers",
          createdAt: new Date("2026-10-03T12:00:00Z"),
        },
      ],
      [],
    );
    const open = textOf(await receiptLine(dupe(), { defaultOpen: true, wrote }));
    assert.ok(open.includes("Filed Re: renewal timing · Lesha Cyphers · 10/3"), open);
    assert.ok(!textOf(html).includes("Re: renewal timing"), "shut, nothing of it shows");
  });

  test("with no Filing row the day is said plainly and the account is the door; the ledger keeps the earlier filing", async () => {
    const html = await receiptLine(dupe({ prior: { day: "8/12" } }));
    assert.equal(
      textOf(html),
      "regis-renewal.eml · Already on file. Nothing filed twice. · Regis HR Group · Filed 8/12 ✕",
    );
    assert.ok(!/<button[^>]*>Filed/.test(html));
    assert.deepEqual(storedRow(dupe()).prior, { day: "10/3", filingId: "f0" });
    // A twin in flight says so, under the same decree's second sentence.
    assert.equal(ALREADY_FILING, "Already filing. Nothing filed twice.");
    // The server hands the line and the earlier filing apart: no day spliced
    // between the decree's two sentences (B48).
    const actions = read("src/app/room/actions.ts");
    assert.ok(!actions.includes("Already on file.${when}"));
    assert.match(actions, /reason: ALREADY_ON_FILE,\s*prior: \{/);
    assert.match(actions, /const earlier = await findFiling\(acct\.id, fingerprint\);/);
    assert.match(
      read("src/app/room/chute.tsx"),
      /state: "dupe",\s*reason: r\.reason \?\? ALREADY_ON_FILE,\s*prior: r\.prior,/,
    );
  });
});

describe("a take-back and a backup open to what they report (pass 8, C5)", () => {
  const undone = (over: Partial<LedgerRow> = {}): LedgerRow =>
    filed({
      state: "undone",
      reason: "Taken back from Regis HR Group. 4 removed.",
      ...over,
    });

  test("the take-back opens to the lines it took while the tab holds them", async () => {
    const took = wroteFrom(
      [
        {
          body: "✉ OL 10/3 9:14 AM — Re: renewal timing · Lesha Cyphers",
          createdAt: new Date("2026-10-03T12:00:00Z"),
        },
      ],
      [{ body: "Send the census.\n⚑[k:a]" }],
      { asks: ["Which countries are first?"] },
    );
    const shut = await receiptLine(undone({ took }));
    assert.match(
      shut,
      /<button type="button" class="rcptOpen" aria-expanded="false" title="Show what was taken back">Taken back from Regis HR Group\. 4 removed\.<\/button>/,
    );
    assert.ok(!textOf(shut).includes("Send the census."));
    const open = textOf(await receiptLine(undone({ took }), { defaultOpen: true }));
    for (const s of [
      "Filed Re: renewal timing",
      "To-do Send the census.",
      "Ask Which countries are first?",
    ])
      assert.ok(open.includes(s), s);
    // The lines are body text: the ledger never keeps them (D12).
    assert.equal(storedRow(undone({ took })).took, undefined);
  });

  test("after a reload it opens to the counts it kept, and with nothing kept it is plain", async () => {
    const open = textOf(await receiptLine(undone({ asks: 2 }), { defaultOpen: true }));
    assert.ok(open.endsWith("3 filed · 1 to-do · 2 asks"), open);
    const bare = await receiptLine({
      key: 2,
      filename: "",
      state: "undone",
      reason: "Taken back from Regis HR Group. 3 removed.",
    });
    assert.ok(!bare.includes("rcptOpen"), "nothing to open, no door drawn");
    assert.equal(textOf(bare), "↺ Taken back from Regis HR Group. 3 removed. ✕");
  });

  test("the Chute hands the take-back's lines to its row, read before the rows go", () => {
    assert.match(read("src/app/room/chute.tsx"), /took: r\.took,/);
    const actions = read("src/app/room/actions.ts");
    const undo = actions.slice(
      actions.indexOf("export async function roomPasteUndo("),
      actions.indexOf("// --- Closing a deal"),
    );
    const tookAt = undo.indexOf("await wroteOfFiling(acct.id, filing)");
    assert.ok(
      tookAt > 0 && tookAt < undo.indexOf("await undoFiling(filing, acct.id)"),
      "read before the take-back",
    );
    assert.ok(undo.includes("...(took ? { took } : {}),"));
  });
});

describe("a readable file whose filing fails still backs up (pass 8 call 8)", () => {
  const eml = new File(["From: a"], "regis-renewal.eml");

  test("the plan hands a failed filing's file to the backup; a duplicate vaults nothing new", () => {
    assert.deepEqual(vaultAfterVerdict({ ok: false }, [eml]), {
      archive: [],
      hold: [],
      failed: [eml],
    });
    assert.deepEqual(vaultAfterVerdict({ ok: false, duplicate: true }, [eml]), {
      archive: [],
      hold: [],
    });
    assert.deepEqual(
      vaultAfterVerdict({ ok: false, mismatch: { claim: "Simploy" } }, [eml]),
      { archive: [], hold: [eml] },
    );
    assert.deepEqual(vaultAfterVerdict({ ok: false }, []), { archive: [], hold: [] });
  });

  test("the receipt says the filing failed and the file is backed up, with its door", async () => {
    const failed = (vault: LedgerRow["vault"]): LedgerRow => ({
      key: 7,
      filename: "regis-renewal.eml",
      state: "error",
      account: REGIS,
      reason: "Filing failed partway. Check the account page.",
      day: "10/6",
      vault,
    });
    const landed = await receiptLine(
      failed({
        text: "accounts/Regis HR Group/regis-renewal.eml",
        url: "https://github.com/o/vault/z",
      }),
    );
    assert.equal(
      textOf(landed),
      "regis-renewal.eml · Filing failed partway. Check the account page. ✕ ⇪ Not filed. Backed up. · open",
    );
    assert.match(
      landed,
      /<a href="https:\/\/github\.com\/o\/vault\/z" target="_blank" rel="noreferrer">open<\/a>/,
    );
    const going = textOf(
      await receiptLine(
        failed({ text: "Backing up regis-renewal.eml… 1 of 3", going: true }),
      ),
    );
    assert.ok(going.endsWith("⇪ Backing up regis-renewal.eml… 1 of 3"), going);
    const bad = await receiptLine(
      failed({ text: "The backup didn't land. Drop it again.", bad: true }),
    );
    assert.match(
      bad,
      /<p class="rcptCaveat">The backup didn&#x27;t land\. Drop it again\.<\/p>/,
    );
    assert.ok(!textOf(bad).includes("Backed up"));
  });

  test("the Chute backs the file up to the account it was filing to, or under accounts/_unfiled/", () => {
    const src = read("src/app/room/chute.tsx");
    assert.match(
      src,
      /const \[failed\] = r\.vault\.failed \?\? \[\];\s*if \(failed\) void backUp\(key, failed, account\);/,
    );
    assert.match(
      src,
      /let r = account \? await ingest\.vault\(account\.id, f, progress\) : null;\s*if \(!r\?\.ok\) r = await ingest\.vaultUnfiled\(f, progress\);/,
    );
    assert.match(
      src,
      /reason: "The filing broke\. Drop it again\." \}\);\s*void backUp\(key, f, filingTo\);/,
    );
  });
});

// ── the Drop's half (pass 9 seam, S-1) ─────────────────────────────────────
// The Chute slice gave the result its fields (r.vault.failed, r.prior,
// r.took) and painted them on the Chute; the Drop read none of them. A file
// whose filing failed on a row never reached git (pass 8 call 8), its
// duplicate was a bare note with no door to the earlier filing (C2), and its
// take-back opened to nothing (C5).

describe("the Drop backs up, opens the duplicate and the take-back like the Chute (S-1)", () => {
  const SIMPLOY_ROW = { id: SIMPLOY.id, name: SIMPLOY.name };
  const eml = new File(["From: a"], "simploy-renewal.eml");

  test("a failed filing with a file is an error receipt that backs up; a paste's refusal stays the note", async () => {
    const { dropRefusal } = await roomClient();
    const row = dropRefusal(
      {
        ok: false,
        reason: "Filing failed partway. Check the account page.",
        vault: { archive: [], hold: [], failed: [eml] },
      },
      SIMPLOY_ROW,
      eml.name,
      "10/7",
    );
    assert.deepEqual(row, {
      filename: "simploy-renewal.eml",
      state: "error",
      account: SIMPLOY_ROW,
      reason: "Filing failed partway. Check the account page.",
      day: "10/7",
    });
    const landed = await receiptLine({
      key: 1,
      ...row!,
      vault: {
        text: "accounts/Simploy/simploy-renewal.eml",
        url: "https://github.com/o/vault/s",
      },
    });
    assert.equal(
      textOf(landed),
      "simploy-renewal.eml · Filing failed partway. Check the account page. ✕ ⇪ Not filed. Backed up. · open",
    );
    // A paste that files nothing has no file to back up: the row's note says it.
    assert.equal(
      dropRefusal(
        { ok: false, reason: "Paste something first.", vault: { archive: [], hold: [] } },
        SIMPLOY_ROW,
        "",
        "10/7",
      ),
      null,
    );
  });

  test("a duplicate is the Chute's receipt: the decree's line and the earlier filing's day, which opens", async () => {
    const { dropRefusal } = await roomClient();
    const r = {
      ok: false,
      duplicate: true,
      reason: ALREADY_ON_FILE,
      prior: { day: "10/3", filingId: "f0" },
      vault: { archive: [], hold: [] },
    };
    const file = dropRefusal(r, SIMPLOY_ROW, eml.name, "10/7");
    assert.deepEqual(file, {
      filename: "simploy-renewal.eml",
      state: "dupe",
      account: SIMPLOY_ROW,
      reason: ALREADY_ON_FILE,
      prior: { day: "10/3", filingId: "f0" },
      day: "10/7",
    });
    const html = await receiptLine({ key: 2, ...file! });
    assert.equal(
      textOf(html),
      "simploy-renewal.eml · Already on file. Nothing filed twice. · Simploy · Filed 10/3 ✕",
    );
    assert.match(
      html,
      /title="Show what the earlier filing wrote">Filed 10\/3<\/button>/,
    );
    // A pasted duplicate is named as the held box names a paste.
    const paste = dropRefusal({ ...r, prior: { day: "10/3" } }, SIMPLOY_ROW, "", "10/7");
    assert.equal(
      textOf(await receiptLine({ key: 3, ...paste! })),
      "Paste · Already on file. Nothing filed twice. · Simploy · Filed 10/3 ✕",
    );
  });

  test("the backup goes to the account it was filing to, or under accounts/_unfiled/ when that is refused", async () => {
    const { backUpFailed } = await roomClient();
    const asked: string[] = [];
    const doors = (accountOk: boolean) => ({
      vault: async (accountId: string) => {
        asked.push(`vault ${accountId}`);
        return accountOk
          ? {
              ok: true as const,
              kind: "file" as const,
              url: "https://github.com/o/vault/a",
              detail: "accounts/Simploy/simploy-renewal.eml",
            }
          : { ok: false as const, reason: "The vault refused it." };
      },
      vaultUnfiled: async () => {
        asked.push("unfiled");
        return {
          ok: true as const,
          kind: "file" as const,
          url: "https://github.com/o/vault/u",
          detail: "accounts/_unfiled/simploy-renewal.eml",
        };
      },
    });
    const there = await backUpFailed(doors(true), eml, SIMPLOY_ROW);
    assert.deepEqual(asked, [`vault ${SIMPLOY.id}`]);
    assert.ok(there.ok && there.detail.startsWith("accounts/Simploy/"));
    asked.length = 0;
    const unfiled = await backUpFailed(doors(false), eml, SIMPLOY_ROW);
    assert.deepEqual(asked, [`vault ${SIMPLOY.id}`, "unfiled"]);
    assert.ok(unfiled.ok && unfiled.detail.startsWith("accounts/_unfiled/"));
    asked.length = 0;
    await backUpFailed(doors(true), eml, undefined);
    assert.deepEqual(asked, ["unfiled"], "no account named, straight to _unfiled");
  });

  test("the Drop wires them: the refusal's receipt, the failed files' backup, the take-back's lines", () => {
    const src = read("src/app/room/room-client.tsx");
    const fileText = src.slice(
      src.indexOf("  const fileText = async ("),
      src.indexOf("  const answerHeld = "),
    );
    assert.match(
      fileText,
      /const refused = dropRefusal\(r, account, waiting\?\.\[0\]\?\.name \?\? "", receiptDay\(\)\);/,
    );
    assert.match(
      fileText,
      /for \(const f of vault\.failed \?\? \[\]\) void backUp\(key, f, account\);/,
    );
    // A filing that broke backs its files up too, as the Chute's does.
    assert.match(
      src,
      /reason: "The filing broke\. Drop it again\.",[\s\S]{0,200}?void backUp\(/,
    );
    const takeBack = src.slice(
      src.indexOf("  const takeBack = (rc: LedgerRow)"),
      src.indexOf("  const clearReceipt = "),
    );
    assert.match(takeBack, /took: r\.took,/);
  });
});

describe("the Chute's own copy obeys the writing canon (pass 8, C3, C4, C6, B48)", () => {
  test("the pact is short, plain and true to today's pipeline", async () => {
    const { Chute } = await chute();
    const html = await render(createElement(Chute, { canWrite: true }));
    const pact = textOf(/<p class="chutePact">([\s\S]*?)<\/p>/.exec(html)?.[1] ?? "");
    assert.ok(pact.startsWith("The pact:"), pact);
    const words = pact.split(/\s+/).filter(Boolean).length;
    assert.ok(words <= 100, `${words} words`);
    assert.ok(!pact.includes("—"), "an em-dash aside");
    assert.ok(!/\([^)]*\)/.test(pact), "a parenthetical");
    assert.ok(!/\bToday\b/.test(pact), "names a retired page");
    assert.ok(!/pre-release|25MB|2GB/i.test(pact), "the retired large-file lane");
    assert.ok(!/\bClaude\b/.test(pact), "a model name");
    for (const fact of [
      "git",
      "Nothing files twice.",
      "waits for your pick",
      "survive a reload",
    ])
      assert.ok(pact.includes(fact), fact);
  });

  test("the activity drop's lines carry no dash aside and no closer", () => {
    const code = read("src/app/room/chute.tsx")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
    const literals = [
      ...code.matchAll(
        /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g,
      ),
    ].map((m) => (m[1] ?? m[2] ?? m[3] ?? "").replace(/\$\{[^}]*\}/g, ""));
    for (const s of literals) {
      assert.ok(!s.includes("—"), `an em-dash in "${s}"`);
      if (/\s/.test(s)) assert.ok(!/\([^)]*\)/.test(s), `a parenthetical in "${s}"`);
    }
    assert.ok(!/staging replaces wholesale/.test(code));
    // The take-back's lines state the fact flat, with no consequence closer
    // ("… not kept, so nothing is restored"), as the dock's do.
    assert.ok(!/nothing (is|was) restored/i.test(code));
    assert.ok(code.includes('"Press again to clear it. No earlier drop comes back."'));
    assert.ok(code.includes("`${r.lines[0]} No earlier drop came back.`"));
    assert.ok(code.includes('"Nothing changed. The record already holds this drop."'));
  });

  test("their promises count in plain words, and Send-it's duplicate line has no dash", () => {
    assert.deepEqual(receiptCounts({ promises: 1 }), ["1 promise from them"]);
    assert.deepEqual(receiptCounts({ promises: 2 }), ["2 promises from them"]);
    const capture = read("src/app/intranet/capture-actions.ts");
    assert.ok(capture.includes('receipt: "Already in the brain. Nothing new to add."'));
    assert.ok(!capture.includes("Already in the brain —"));
  });

  test("a read a reload cut short comes back in the decree's own words (B48)", () => {
    const storage = memory();
    const now = new Date("2026-10-06T15:00:00Z");
    saveLedger([{ key: 1, filename: "call.vtt", state: "reading" }], storage, now);
    const back = loadLedger(storage, now).items[0];
    assert.equal(back.state, "interrupted");
    assert.equal(back.reason, "interrupted — drop it again");
  });
});

// ── seam S-25 · the Sales Nav grab's receipt ───────────────────────────────
// A grab files each row on the account it surely matches (pass 8 call 12,
// D30), so its receipt names no one account: the grab sits in the account's
// seat, then how many accounts it filed to, the rows that matched no
// account, the rows already on file and the day. Every count opens (the
// click-depth law); ↺ takes back every account's share.

describe("a Sales Nav grab's receipt counts every row and opens to the accounts (seam S-25)", () => {
  const grab = {
    accounts: [
      {
        id: SIMPLOY.id,
        name: SIMPLOY.name,
        rung: "name" as const,
        noteId: "N1",
        filingId: "F1",
      },
      {
        id: REGIS.id,
        name: REGIS.name,
        rung: "name" as const,
        noteId: "N2",
        filingId: "F2",
      },
    ],
    duplicates: [{ id: ADVOCATE.id, name: ADVOCATE.name }],
    failed: [],
    unmatched: 1,
    missed: ["Halcyon Unknown Holdings"],
    dupeCheck: "ran" as const,
  };
  const row: LedgerRow = {
    key: 7,
    filename: "",
    state: "filed",
    filed: 2,
    grab,
    day: "10/7",
  };

  test("the line names the grab in the account's seat, with its counts and the day", async () => {
    const html = await receiptLine(row);
    assert.equal(
      textOf(html),
      "✓ Sales Nav · 2 accounts · 1 row matched no account · 1 already on file · 10/7 ↺ ✕",
    );
    assert.ok(!html.includes("focus="), "the shut line links no one account");
  });

  test("it opens to every count: the accounts as plain links, the unmatched rows, the ones on file", async () => {
    const html = await receiptLine(row, { defaultOpen: true });
    const copy = textOf(html);
    for (const s of [
      "Filed Simploy Regis HR Group",
      "Matched no account Halcyon Unknown Holdings",
      "Already on file Advocate Pay",
    ])
      assert.ok(copy.includes(s), s);
    assert.match(
      html,
      /<a class="rcptAcct" href="\/accounts\?focus=001F000000w38BOIAY">Simploy<\/a>/,
    );
    const words = copyOf(html);
    assert.ok(!words.includes("—"), `an em-dash: ${words}`);
    assert.ok(!/\([^)]*\)/.test(words), `a parenthetical: ${words}`);
  });

  test("a reloaded receipt keeps the ids, names and counts and no row text (D12)", async () => {
    const stored = storedRow({ ...row });
    assert.ok(stored.grab);
    assert.ok(
      !JSON.stringify(stored).includes("Halcyon"),
      "a row's text rode into storage",
    );
    const copy = textOf(await receiptLine(stored, { defaultOpen: true }));
    assert.ok(copy.includes("Matched no account 1 row. Nothing filed."), copy);
  });

  test("the Drop paints the grab's receipt, and its ↺ reaches the whole grab", async () => {
    // A grab pasted in a row's ⚡ box files through roomPaste's split; the
    // Drop's receipt carries the split, so it names the grab and never the
    // row, and the take-back goes through use-undo's grab path.
    const src = read("src/app/room/room-client.tsx");
    const fileText = src.slice(
      src.indexOf("  const fileText = async ("),
      src.indexOf("  const answerHeld = "),
    );
    assert.match(
      fileText,
      /state: "filed",[\s\S]*?grab: r\.grab,[\s\S]*?day: receiptDay\(\),/,
    );
    assert.match(
      src,
      /rc\.state === "filed" &&\s*\(rc\.noteIds\?\.length \|\| rc\.filingId \|\| rc\.grab\?\.accounts\.length\)/,
    );
    const takeBack = src.slice(
      src.indexOf("  const takeBack = (rc: LedgerRow)"),
      src.indexOf("  const clearReceipt = "),
    );
    assert.match(
      takeBack,
      /const from = rc\.grab \? "" : ` from \$\{shortName\(acct\.name\)\}`;/,
    );
    assert.match(
      takeBack,
      /reason: `Taken back\$\{from\}\. \$\{r\.removed \+ r\.retired\} removed\.`,/,
    );
    assert.match(takeBack, /await undo\(acct\.id, rc\)/);
    // The Drop's receipt keeps the row as its account; the line still names
    // the grab and links no one account until it opens.
    const dropRow: LedgerRow = { ...row, account: REGIS };
    const html = await receiptLine(dropRow);
    assert.equal(
      textOf(html),
      "✓ Sales Nav · 2 accounts · 1 row matched no account · 1 already on file · 10/7 ↺ ✕",
    );
    assert.ok(!html.includes("focus="));
    // A grab already on file everywhere is on file under its own accounts,
    // so its duplicate line names no row beside the decree's words.
    const { dropRefusal } = await roomClient();
    const dupe = dropRefusal(
      {
        ok: false,
        duplicate: true,
        reason: `${ALREADY_ON_FILE} 1 row matched no account.`,
        grab: { ...grab, accounts: [] },
        vault: { archive: [], hold: [] },
      },
      REGIS,
      "",
      "10/7",
    );
    assert.ok(dupe && !("account" in dupe), "the row is not the grab's account");
    assert.equal(
      textOf(await receiptLine({ key: 4, ...dupe! })),
      "Paste · Already on file. Nothing filed twice. 1 row matched no account. ✕",
    );
  });

  test("↺ takes back every account's share in one request, each bound to its own account", () => {
    assert.deepEqual(grabUndoRequest(grab), [
      [
        { id: SIMPLOY.id, noteId: "N1", filingId: "F1" },
        { id: REGIS.id, noteId: "N2", filingId: "F2" },
      ],
    ]);
    // The server runs each share through the one take-back, bound to its
    // account: no id list reaches past the account it names.
    const actions = read("src/app/room/actions.ts");
    const undo = actions.slice(
      actions.indexOf("export async function roomGrabUndo("),
      actions.indexOf("export async function roomPasteUndo("),
    );
    assert.match(undo, /roomPasteUndo\(\s*x\.id,\s*\[x\.noteId\],\s*\[\],/);
    assert.match(
      read("src/app/room/ingest/use-undo.ts"),
      /await roomGrabUndo\(\.\.\.grabUndoRequest\(row\.grab\)\)/,
    );
  });
});

// ── pass 10: every operator string on the ingest surfaces is linted ─────────
// The writing canon and the plain-speech law (CLAUDE.md, rows A12.1 to A12.12
// of the scoreboard) on every ingest surface: the Chute, the Drop, the held
// box, the receipts, Send-it, the Intranet dock and its run log, and the
// activity run's receipts. Most of these strings are built inside server
// actions that gate on the session, so no render reaches them; the sweep
// reads every string literal, template and JSX text the scope's modules
// spell (the TypeScript parser, never a regex over source) and runs each
// through the repo's canon lint (src/lib/activity/lint.ts) plus the checks the
// lint leaves to its callers. A future device, hedge, dash aside or
// parenthetical in any of them fails the build.

const INGEST_FILES: string[] = [
  "src/app/room/chute.tsx",
  "src/app/room/chute-ledger.ts",
  "src/app/room/read-file.ts",
  "src/app/room/route-actions.ts",
  "src/app/room/vault-actions.ts",
  "src/app/room/filing-actions.ts",
  "src/lib/activity/run.ts",
  "src/lib/activity/upload.ts",
  "src/lib/intranet/capture-door.ts",
  // The Intranet's own lines from its lib: the Send-it receipt, the feed's
  // day dividers, the health page's ceilings and checks, the replayed
  // digests; and the HomeRoom pipeline's stale note (pass 10, by order).
  "src/lib/intranet/normalize.ts",
  "src/lib/intranet/store.ts",
  "src/lib/intranet/evals.ts",
  "src/lib/intranet/ledger.ts",
  "src/app/room/pipeline-actions.ts",
  ...[
    "src/app/room/ingest",
    "src/lib/ingest",
    "src/app/intranet",
    "src/app/activity",
  ].flatMap((d) =>
    (readdirSync(join(root, d), { recursive: true }) as string[])
      .filter((f) => /\.tsx?$/.test(f))
      .map((f) => join(d, f)),
  ),
];

// The Drop lives inside the HomeRoom's Row: its handlers by name, and the
// element that takes the drop. A rename fails the sweep rather than
// quietly shrinking it.
const DROP_HANDLERS = [
  "dropRefusal",
  "readingDrop",
  "queuedDrop",
  "submitCompose",
  "backUp",
  "filePaste",
  "fileText",
  "answerHeld",
  "dropHeldPaste",
  "unfileHeld",
  "readDroppedFile",
  "archiveFiles",
  "handleFiles",
  "submitPaste",
];

// Strings in scope that no operator reads, each with its reason. Every entry
// must still match a string, so the list cannot rot into a blanket pass.
const NOT_COPY: { file: string; has: string; why: string }[] = [
  {
    file: "src/app/room/chute-ledger.ts",
    has: "interrupted — drop it again",
    why: "the decree's own words, verbatim (CLAUDE.md, The Chute; B48)",
  },
  {
    file: "src/app/room/read-file.ts",
    has: "DOCUMENT — ",
    why: "a capture's head line: the dialect the reader writes and the sniffers read",
  },
  {
    file: "src/lib/activity/run.ts",
    has: "the room's own run lock",
    why: "the lock row's raw text; every capture read excludes it by checksum",
  },
  {
    file: "src/app/intranet/runners.ts",
    has: "the room's own run lock",
    why: "the lock row's raw text; every capture read excludes it by checksum",
  },
  {
    file: "src/lib/activity/run.ts",
    has: "the operator is ",
    why: "the distiller's context pack, read only by the model",
  },
  {
    file: "src/lib/activity/run.ts",
    has: "the operator's last outbound",
    why: "the distiller's context pack, read only by the model",
  },
  {
    file: "src/lib/activity/run.ts",
    has: "a live board row exists",
    why: "the distiller's context pack, read only by the model",
  },
  {
    file: "src/lib/activity/run.ts",
    has: "your first pass produced nothing",
    why: "the distiller's retry instruction, read only by the model",
  },
  {
    file: "src/lib/ingest/verdict-reason.ts",
    has: "(no page data on file)",
    why: "the reason model's prompt",
  },
  {
    file: "src/lib/ingest/verdict-reason.ts",
    has: "(not an account in our book)",
    why: "the reason model's prompt",
  },
  {
    file: "src/lib/ingest/verdict-reason.ts",
    has: " in the book)",
    why: "the reason model's prompt",
  },
  {
    file: "src/app/intranet/intranet-client.tsx",
    has: "(start with: ",
    why: "the question as the brain receives it, never rendered",
  },
];

/** Every string a module spells: literals, templates with each hole read as
 *  "X", and each JSX element's own text with its holes read the same way. */
function spelled(file: string, only?: (n: ts.Node) => boolean): string[] {
  const src = read(file);
  const sf = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const out: string[] = [];
  const entity = (s: string) =>
    s
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  const walk = (n: ts.Node, inScope: boolean) => {
    const live = inScope || !only || only(n);
    if (live) {
      if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
      // A pattern handed to RegExp is a reader's grammar, never copy.
      if (ts.isNewExpression(n) && n.expression.getText(sf) === "RegExp") return;
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))
        out.push(n.text);
      else if (ts.isTemplateExpression(n))
        out.push(n.head.text + n.templateSpans.map((s) => "X" + s.literal.text).join(""));
      else if (
        (ts.isJsxElement(n) || ts.isJsxFragment(n)) &&
        n.children.some((c) => ts.isJsxText(c) && /[A-Za-z—–]/.test(c.text))
      )
        out.push(
          entity(
            n.children
              .map((c) =>
                ts.isJsxText(c)
                  ? c.text
                  : ts.isJsxExpression(c) &&
                      c.expression &&
                      ts.isStringLiteral(c.expression)
                    ? c.expression.text
                    : ts.isJsxExpression(c) && !c.expression
                      ? ""
                      : "X",
              )
              .join("")
              .replace(/\s+/g, " ")
              .trim(),
          ),
        );
    }
    ts.forEachChild(n, (c) => walk(c, live));
  };
  walk(sf, false);
  // A dash between two holes ("X — X") is a line too; a lone "—" is a blank.
  return out.filter(
    (s) => /[A-Za-z]{2}/.test(s) || (/[—–]/.test(s) && /[A-Za-z]/.test(s)),
  );
}

/** The Drop's strings: its handlers inside the HomeRoom's Row, and the
 *  element that takes the drop. */
function dropSpelled(): { strings: string[]; found: Set<string> } {
  const found = new Set<string>();
  const strings = spelled("src/app/room/room-client.tsx", (n) => {
    if (
      (ts.isFunctionDeclaration(n) || ts.isVariableDeclaration(n)) &&
      n.name &&
      ts.isIdentifier(n.name) &&
      DROP_HANDLERS.includes(n.name.text)
    ) {
      found.add(n.name.text);
      return true;
    }
    if (
      ts.isJsxElement(n) &&
      n.openingElement.attributes.properties.some(
        (p) => ts.isJsxAttribute(p) && p.name.getText() === "onDrop",
      )
    ) {
      found.add("onDrop");
      return true;
    }
    return false;
  });
  return { strings, found };
}

// A reassurance flourish or invented slang the plain-speech law names, and
// the noun-form the writing canon's first rule names ("delivery is pending").
const FLOURISH_RE =
  /\b(and that's (fine|okay|ok)|no judg(e)?ment|shouldn't have to|don't worry|no worries|rest assured|read-back|when it's home|on the first pass|unlocks the full shape)\b/i;
const NOUN_FORM_RE =
  /\b\w+ (delivery|follow-up|outreach|review) is (pending|due|outstanding)\b/i;

/** What the canon finds in one operator string, or nothing. */
function canonFaults(s: string): string[] {
  const t = s.replace(/\s+/g, " ").trim();
  // lintReason carries the hedges, the retired words (steps, X-shaped, their
  // own book, domestic-only) and the seven devices; its word cap is for
  // reason lines and its digit rule is for gem prose, and a receipt's counts
  // are arithmetic, so both stay out here.
  const faults = lintReason(t).faults.filter(
    (f) => !/the cap is|a digit that is not a date/.test(f),
  );
  // The deadline check runs on every line: no ingest string tells the
  // operator to act by a day.
  if (lintAct(t).faults.includes("a deadline rides the action line"))
    faults.push("a deadline");
  if (/[—–]/.test(t) && /[A-Za-z]/.test(t)) faults.push("a dash aside");
  if (/\([^()]*[A-Za-z][^()]*\)/.test(t) && /\s/.test(t)) faults.push("a parenthetical");
  if (FLOURISH_RE.test(t)) faults.push("a flourish or invented slang");
  if (NOUN_FORM_RE.test(t)) faults.push("a noun-form instruction");
  return faults;
}

describe("every operator string on the ingest surfaces obeys the writing canon and the plain-speech law (pass 10, A12)", () => {
  test("the sweep reaches every door: the Chute, the Drop, the held box, the receipts, Send-it, the Intranet and the activity run", () => {
    for (const f of [
      "src/app/room/ingest/held.tsx",
      "src/app/room/ingest/receipt.tsx",
      "src/app/room/ingest/hand-off.ts",
      "src/lib/ingest/guard.ts",
      "src/lib/ingest/grab.ts",
      "src/app/intranet/intranet-client.tsx",
      "src/app/intranet/runners.ts",
      "src/app/intranet/capture-actions.ts",
      "src/app/activity/dock.tsx",
      "src/app/activity/actions.ts",
    ])
      assert.ok(INGEST_FILES.includes(f), `the sweep misses ${f}`);
    const { strings, found } = dropSpelled();
    assert.deepEqual(
      [...found].sort(),
      [...DROP_HANDLERS, "onDrop"].sort(),
      "a Drop handler was renamed out of the sweep",
    );
    assert.ok(
      strings.some((s) => /Read & file/.test(s)),
      "the Drop's own face is in the sweep",
    );
    // The canon's own examples fail the sweep's checks, so the sweep is live.
    for (const bad of [
      "A country is a lens, not a copy.",
      "Kept — but the brain is unreachable.",
      "Read clean, nothing worth keeping, and that's fine.",
      "Keep in the Playbook (the bank)",
      "It may be worth a second look.",
      "Send the model by Friday.",
      "Model delivery is pending.",
      "This drop looks EOR-shaped.",
      "Questions now are free, later they're change orders.",
    ])
      assert.ok(canonFaults(bad).length > 0, `the sweep let through: ${bad}`);
  });

  test("no string in scope carries a device, a hedge, a deadline, a dash aside, a parenthetical, retired words or a flourish", () => {
    const used = new Set<number>();
    const faults: string[] = [];
    const sweep = (file: string, strings: string[]) => {
      for (const s of strings) {
        const skip = NOT_COPY.findIndex((x) => x.file === file && s.includes(x.has));
        if (skip >= 0) {
          used.add(skip);
          continue;
        }
        const f = canonFaults(s);
        if (f.length) faults.push(`${file}: ${f.join(", ")} in "${s.slice(0, 160)}"`);
      }
    };
    for (const file of INGEST_FILES) sweep(file, spelled(file));
    sweep("src/app/room/room-client.tsx", dropSpelled().strings);
    assert.deepEqual(faults, []);
    const stale = NOT_COPY.filter((_, i) => !used.has(i)).map(
      (x) => `${x.file}: ${x.has}`,
    );
    assert.deepEqual(stale, [], "a NOT_COPY entry matches nothing; remove it");
  });
});

// ── pass 10: the click-depth law on the ingest surfaces (A5) ────────────────
// "Every compression opens … exactly one click deep. Nothing compressed is
// ever a dead end, and nothing deep ever surfaces uninvited." The Chute's
// second-record receipt counted rows, accounts and email text and opened to
// nothing: its only link landed on the Intranet with the dock's receipt
// folded, a second click away. The counts are a door now, and the dock opens
// its receipt when the page is arrived at by that door.

describe("the Chute's second-record counts open the run's receipt in one click (pass 10, A5)", () => {
  test("the counts are a link to the dock's anchor, and the dock answers to it", async () => {
    const { ActivityCame } = await chute();
    const { ActivityDock, DOCK_ANCHOR, opensOnArrival } =
      await import("../src/app/activity/dock");
    const html = await render(
      createElement(ActivityCame, { came: { rows: 412, accounts: 37, textRows: 1 } }),
    );
    assert.match(html, new RegExp(`<a href="/intranet#${DOCK_ANCHOR}"`));
    assert.equal(textOf(html), "412 rows · 37 accounts · 1 carrying email text.");
    assert.equal(
      textOf(
        await render(
          createElement(ActivityCame, { came: { rows: 1, accounts: 1, textRows: 0 } }),
        ),
      ),
      "1 row · 1 account · 0 carrying email text.",
    );
    // The dock carries the anchor, and arriving by it opens the receipt.
    assert.match(
      await render(createElement(ActivityDock, { book: [], canWrite: true })),
      new RegExp(`id="${DOCK_ANCHOR}"`),
    );
    assert.equal(opensOnArrival(`#${DOCK_ANCHOR}`), true);
    assert.equal(opensOnArrival(""), false);
    assert.equal(opensOnArrival("#elsewhere"), false);
  });

  test("nothing deep surfaces uninvited: the held box's grounds and the receipt's lists stay shut at first paint", async () => {
    const shut = textOf(
      await heldBox({ verdict: TEXT_VERDICT, claim: SIMPLOY.name, bound: REGIS }),
    );
    assert.ok(!shut.includes("In the text"), shut);
    assert.ok(!shut.includes("Nothing in the text names Regis HR Group"), shut);
    const wrote = {
      filed: ["Re: renewal · Lesha Cyphers · 10/3"],
      todos: ["Send the census template."],
      promises: [],
      asks: ["Which countries are first?"],
      learned: [],
    };
    const line = textOf(await receiptLine(filed({ asks: 1 }), { wrote }));
    for (const s of [
      "Re: renewal",
      "Send the census template.",
      "Which countries are first?",
    ])
      assert.ok(!line.includes(s), s);
  });
});

// ── pass 10: a held file carries past the Chicago day (A12.7) ───────────────
// Yesterday carries (the writing canon, rule 7), ruled for the Chute under
// C20 and D8: a held row left unpicked when the day turned used to vanish
// with the day's ledger, and the file, which vaults only after its pick, was
// never backed up. Waiting rows carry now and say since when; settled rows
// still reset per day; a file the ledger cannot keep says so and asks for
// the re-drop.

describe("a held row left unpicked carries past the Chicago day and says since when (pass 10, A12.7)", () => {
  const DAY1 = new Date("2026-10-07T18:00:00Z");
  const DAY2 = new Date("2026-10-08T18:00:00Z");
  const DAY3 = new Date("2026-10-09T18:00:00Z");
  const heldRow: LedgerRow = {
    key: 3,
    filename: "simploy-renewal.eml",
    state: "mismatch",
    text: "OUTLOOK THREAD — simploy-renewal.eml\nthe board meets",
    account: REGIS,
    claim: SIMPLOY.name,
    verdict: TEXT_VERDICT,
  };
  const binary: LedgerRow = {
    key: 2,
    filename: "call.mp4",
    state: "pick",
    candidates: [{ id: REGIS.id, name: REGIS.name, rung: "name" }],
  };

  test("the next day the held row comes back held, with its text and verdict, and Held since the day it was left", () => {
    const storage = memory();
    saveLedger([heldRow, binary, filed()], storage, DAY1);
    const { items } = loadLedger(storage, DAY2);
    assert.deepEqual(
      items.map((x) => x.key),
      [3, 2],
      "the settled row reset with the day",
    );
    const [held, lost] = items;
    assert.equal(held.state, "mismatch");
    assert.equal(held.text, heldRow.text);
    assert.deepEqual(held.verdict, TEXT_VERDICT);
    assert.equal(held.heldSince, "10/7");
    // The binary the ledger could not keep says so and asks for the re-drop.
    assert.equal(lost.state, "interrupted");
    assert.equal(lost.reason, "The pick did not survive. Drop the file again.");
    // A third day keeps the first day it was left; the re-drop line was a
    // settled receipt and resets.
    saveLedger(items, storage, DAY2);
    const third = loadLedger(storage, DAY3).items;
    assert.deepEqual(
      third.map((x) => [x.key, x.state, x.heldSince]),
      [[3, "mismatch", "10/7"]],
    );
  });

  test("the held box says Held since M/D. only on a carried row", async () => {
    const carried = textOf(
      await heldBox({
        verdict: TEXT_VERDICT,
        claim: SIMPLOY.name,
        bound: REGIS,
        since: "10/7",
      }),
    );
    assert.ok(carried.includes("Held since 10/7."), carried);
    assert.ok(
      !textOf(
        await heldBox({ verdict: TEXT_VERDICT, claim: SIMPLOY.name, bound: REGIS }),
      ).includes("since"),
    );
    // The Chute hands the row's day to the box.
    assert.match(read("src/app/room/chute.tsx"), /since=\{it\.heldSince\}/);
  });
});
