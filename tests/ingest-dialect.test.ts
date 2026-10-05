// The dialect module — one home for the capture head alphabet, one sniff, the
// source-literal table and the predicates over it (the Chute brains refactor
// plan, §2.3; slice 1). Every reader imports it; the writer keeps emitting
// exactly what it emitted before, and this suite holds that line.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  DIALECTS,
  GLYPH_RE,
  HEADS,
  HEAD_LIST,
  LEGACY_HEAD_RE,
  SOURCES,
  SOURCE_OF,
  isCall,
  isPaste,
  isSalesNav,
  isTape,
  isWire,
  sniffHead,
  type Dialect,
} from "../src/lib/ingest/dialect";
import { dialectOf, sourceFor, transcriberPrompt } from "../src/lib/room/paste";
import {
  emlToPaste,
  msgToPaste,
  parseTranscriptDoc,
  pasteFingerprint,
  sheetToPaste,
  sniffPaste,
  transcriptDocToPaste,
  transcriptRecordedDay,
  vttToPaste,
} from "../src/lib/paste-files";
import { TOOLS } from "../src/app/intake/grabs";
import { parseSfTimeline } from "../src/lib/sf-timeline";
import { readSpace } from "../src/lib/intranet/normalize";
import { isMeetingNote } from "../src/lib/intel/meeting";
import { headClockMinutes } from "../src/lib/intel/clock";
import { clauseFromHead } from "../src/lib/sendbook/read";
import { sanitizeAiResult } from "../src/lib/intel/ai-clean";
import {
  actorsLine,
  inferActors,
  inferLane,
  inferSubject,
} from "../src/lib/intel/provenance";

// ── every producer head sniffs to its dialect ───────────────────────────────

const EML = [
  "From: Dana Ellis <dana@simploy.example>",
  "To: Antaeus Coe <acoe@prismhr.com>",
  "Date: Tue, 02 Sep 2026 09:44:00 -0500",
  "Subject: Renewal",
  "",
  "The board meets Thursday.",
].join("\n");

const VTT = [
  "WEBVTT",
  "",
  "1",
  "00:00:01.000 --> 00:00:03.000",
  "<v Dana Ellis>Thanks for making time today.</v>",
  "",
  "2",
  "00:00:04.000 --> 00:00:06.000",
  "<v Antaeus Coe>Of course.</v>",
].join("\n");

const TRANSCRIPT_DOC = [
  "Infiniti call-20260827_100000-Meeting Recording",
  "0:02 Thanks for making time today.",
  "0:05 Of course.",
  "0:09 Let's start with Mexico.",
].join("\n");

describe("the head alphabet — every producer head sniffs to its dialect", () => {
  test("the Drop's readers", () => {
    const eml = emlToPaste(EML, "thread.eml");
    assert.deepEqual(sniffHead(eml), { dialect: "OL", head: HEADS.outlook });
    const msg = msgToPaste(
      { subject: "Renewal", senderName: "Dana Ellis", body: "The board meets." },
      "mail.msg",
    );
    assert.deepEqual(sniffHead(msg), { dialect: "OL", head: HEADS.outlook });
    const vtt = vttToPaste(VTT, "call-20260827_100000-Meeting Recording.vtt");
    assert.deepEqual(sniffHead(vtt), { dialect: "CT", head: HEADS.call });
    const doc = parseTranscriptDoc(TRANSCRIPT_DOC);
    assert.ok(doc, "the transcript document did not parse");
    const docPaste = transcriptDocToPaste(doc, "call.docx");
    assert.deepEqual(sniffHead(docPaste), { dialect: "CT", head: HEADS.call });
    const sheet = sheetToPaste(
      [{ name: "Accounts", rows: [["Simploy", "Mexico"]] }],
      "a.xlsx",
    );
    assert.deepEqual(sniffHead(sheet), { dialect: "SF", head: HEADS.spreadsheet });
    // The docx reader's head for a document that is not a transcript
    // (src/app/room/read-file.ts).
    assert.deepEqual(sniffHead("DOCUMENT — memo.docx\n\nThe board meets Thursday."), {
      dialect: "SF",
      head: HEADS.document,
    });
  });

  test("the bookmarklets' heads", () => {
    const by = (key: string) =>
      TOOLS.find((t) => t.key === key)!.build("https://cc.test");
    assert.ok(by("outlook").includes(`${HEADS.outlook} - captured `));
    assert.ok(by("teams").includes(`${HEADS.teams} - `));
    assert.ok(by("salesnav").includes(`${HEADS.salesnav} ACCOUNTS - captured `));
    assert.deepEqual(
      sniffHead("OUTLOOK THREAD - captured 9/25/2026, 10:00:00 AM\n\nhi"),
      {
        dialect: "OL",
        head: HEADS.outlook,
      },
    );
    assert.deepEqual(
      sniffHead(
        "TEAMS THREAD - Global Sales Team - captured 9/25/2026, 10:00:00 AM\n\nhi",
      ),
      { dialect: "TM", head: HEADS.teams },
    );
    assert.deepEqual(
      sniffHead("SALESNAV ACCOUNTS - captured 9/25/2026 - 12 rows collected\n\nSimploy"),
      { dialect: "SN", head: HEADS.salesnav },
    );
  });

  test("TEAMS CHAT sniffs to TM, and the typed note to SF under its own head", () => {
    assert.deepEqual(sniffHead("TEAMS CHAT - Aleks\n[9:02] hi"), {
      dialect: "TM",
      head: HEADS.teamsChat,
    });
    assert.equal(sniffPaste("TEAMS CHAT - Aleks\n[9:02] hi").kind, "teams");
    assert.deepEqual(sniffHead("TYPED NOTE — at the row\nmet the team, good energy"), {
      dialect: "SF",
      head: HEADS.typed,
    });
  });

  test("a capture with no head is Salesforce activity", () => {
    assert.deepEqual(sniffHead("Lesha Cyphers to Kim Bartolotti\nRE: PrismOne"), {
      dialect: "SF",
      head: null,
    });
    assert.deepEqual(sniffHead(""), { dialect: "SF", head: null });
    // A word that merely begins with a head is not one.
    assert.equal(sniffHead("DOCUMENTATION review\nall good").head, null);
    assert.equal(sniffHead("Documents attached").head, null);
  });

  test("every head in the table round-trips, leading whitespace and all", () => {
    for (const head of HEAD_LIST) {
      assert.equal(sniffHead(`${head} — anything`).head, head);
      assert.equal(sniffHead(`  \n${head} - captured`).head, head);
    }
    assert.equal(HEAD_LIST.length, 8);
  });

  test("dialectOf and sourceFor keep their answers through the re-export", () => {
    assert.equal(dialectOf("TEAMS THREAD - Simploy · captured 9/25/2026\n\nhi"), "TM");
    assert.equal(dialectOf("OUTLOOK THREAD - captured"), "OL");
    assert.equal(dialectOf("CALL TRANSCRIPT — dropped file x.vtt"), "CT");
    assert.equal(dialectOf("SALESNAV ACCOUNTS - captured"), "SN");
    assert.equal(dialectOf("Lesha Cyphers to Kim Bartolotti\nRE: PrismOne"), "SF");
    for (const d of DIALECTS)
      for (const how of ["rules", "ai", "transcript"])
        assert.equal(sourceFor(d, how), SOURCE_OF(d, null, how), `${d} ${how}`);
  });
});

// ── the source table ────────────────────────────────────────────────────────

/** Every literal a note's source column may carry: the table's, the eight
 *  paste bases with the model's suffix, and the empty column. */
const ALL_LITERALS: string[] = [
  ...Object.values(SOURCES),
  ...["sf", "outlook", "teams", "call", "salesnav", "sheet", "doc", "typed"].map(
    (s) => `${s}-ai`,
  ),
  "",
];

describe("the source table — every stored literal maps through it", () => {
  test("SOURCE_OF by dialect, head and how", () => {
    const cases: [Dialect, (typeof HEAD_LIST)[number] | null, string][] = [
      ["OL", HEADS.outlook, "outlook"],
      ["TM", HEADS.teams, "teams"],
      ["TM", HEADS.teamsChat, "teams"],
      ["CT", HEADS.call, "call"],
      ["SN", HEADS.salesnav, "salesnav"],
      ["SF", null, "sf"],
      ["SF", HEADS.spreadsheet, "sheet"],
      ["SF", HEADS.document, "doc"],
      ["SF", HEADS.typed, "typed"],
      // the dialect outranks the head: a rules read that found an email
      // thread inside a spreadsheet files as the thread
      ["OL", HEADS.spreadsheet, "outlook"],
    ];
    for (const [d, head, want] of cases) {
      assert.equal(SOURCE_OF(d, head, "rules"), want);
      assert.equal(SOURCE_OF(d, head, "ai"), `${want}-ai`);
      assert.equal(SOURCE_OF(d, head, "transcript"), want);
      assert.ok(
        Object.values<string>(SOURCES).includes(want),
        `${want} is off the table`,
      );
    }
  });

  test("the table's literals are the writers' own, each once", () => {
    const values = Object.values(SOURCES);
    assert.equal(new Set(values).size, values.length);
    for (const lit of [
      "transcript",
      "outcome",
      "room",
      "research",
      "gap",
      "playbook",
      "activity",
      "wire",
      "sendbook",
      "act-lane",
      "scratch",
      "touch",
      "move",
      "done",
      "followup",
      "disposition",
      "sheet",
      "pipeline",
      "mail-template",
    ])
      assert.ok(
        values.includes(lit as (typeof values)[number]),
        `${lit} is off the table`,
      );
  });

  test("the predicates agree with isMeetingNote's answers before the module", () => {
    // Captured on main 80a7b17, before meeting.ts read the table: on a body
    // with no meeting in it, isMeetingNote was true for exactly these two
    // sources; on a body carrying the tape's head, for exactly these three;
    // on a transcript body with one speaker, again only the first two.
    const CALL_ONLY = ["call", "call-ai"];
    const CALL_OR_TAPE = ["call", "call-ai", "transcript"];
    const TAPE_HEAD =
      "CALL TRANSCRIPT — dropped file call.vtt\nRecorded: 2026-08-27 10:00\nDana Ellis: hi";
    const ONE_SPEAKER =
      "☰ transcript — filed from the room\nDana Ellis: hi there\nand so on";
    for (const src of ALL_LITERALS) {
      assert.equal(
        isMeetingNote({ body: "quick notes", source: src }),
        CALL_ONLY.includes(src),
        src,
      );
      assert.equal(
        isMeetingNote({ body: TAPE_HEAD, source: src }),
        CALL_OR_TAPE.includes(src),
        src,
      );
      assert.equal(
        isMeetingNote({ body: ONE_SPEAKER, source: src }),
        CALL_ONLY.includes(src),
        src,
      );
      assert.equal(isCall(src), CALL_ONLY.includes(src), src);
      assert.equal(isTape(src), src === "transcript", src);
      assert.equal(isSalesNav(src), src.startsWith("salesnav"), src);
      assert.equal(isWire(src), src === "wire", src);
    }
  });

  test("isPaste reads the file card's old regex and the three new literals", () => {
    // What /^(sf|outlook|teams|transcript|room)/ said on main 80a7b17 …
    for (const src of [
      "sf",
      "sf-ai",
      "outlook",
      "outlook-ai",
      "teams",
      "teams-ai",
      "transcript",
      "room",
    ])
      assert.ok(isPaste(src), src);
    // … and what the three heads that gained a literal need from it.
    for (const src of ["sheet", "sheet-ai", "doc", "doc-ai", "typed", "typed-ai"])
      assert.ok(isPaste(src), src);
    for (const src of [
      "call",
      "call-ai",
      "salesnav",
      "salesnav-ai",
      "wire",
      "outcome",
      "research",
      "activity",
      "",
    ])
      assert.equal(isPaste(src), false, src);
  });

  test("the predicates take an empty column", () => {
    for (const p of [isCall, isTape, isSalesNav, isWire, isPaste]) {
      assert.equal(p(undefined), false);
      assert.equal(p(null), false);
      assert.equal(p(""), false);
    }
  });
});

// ── the legacy alphabet ─────────────────────────────────────────────────────

describe("the legacy alphabet infers from a CT and an SN head", () => {
  test("actors and subject from a call read's head", () => {
    const body =
      "☎ CT Aug 27 10:00 AM — Discovery call · Dana Ellis → Antaeus Coe\nDana Ellis: hi";
    assert.equal(inferActors(body), "Dana Ellis → Antaeus Coe");
    assert.equal(inferSubject(body), "Discovery call");
  });

  test("actors and subject from a Sales Nav head", () => {
    const body =
      "✉ SN Jul 1 — Sales Navigator · Jane Doe → Antaeus Coe\nHigh buyer intent";
    assert.equal(inferActors(body), "Jane Doe → Antaeus Coe");
    assert.equal(inferSubject(body), "Sales Navigator");
  });

  test("a CT row with an empty lane column reads its lane like any paste-filed row", () => {
    const body =
      "☎ CT Aug 27 — Discovery call · Dana Ellis → Tom Boell\nwe talked about Canada";
    assert.equal(inferLane("account", body, "Dana Ellis → Tom Boell"), "background");
    assert.equal(
      inferLane(
        "account",
        "☎ CT Aug 27 — Discovery call · Dana Ellis → Antaeus Coe",
        "Dana Ellis → Antaeus Coe",
      ),
      "mine",
    );
  });

  test("the whole alphabet, and nothing past it", () => {
    for (const d of DIALECTS) {
      const head = `✉ ${d} Jul 22 4:11 PM — Subject · Kim Bartolotti → Lesha Cyphers +2`;
      assert.equal(
        LEGACY_HEAD_RE.exec(head)?.[1],
        "Kim Bartolotti → Lesha Cyphers +2",
        d,
      );
      assert.equal(inferActors(head), "Kim Bartolotti → Lesha Cyphers +2", d);
    }
    // The archive's ☰ head carries no actors and never infers any.
    assert.equal(
      inferActors("☰ Call transcript — call.vtt · 2 voices · full text under the fold"),
      "",
    );
    // The placeholder is a label, never a person.
    assert.equal(inferActors("✉ CT Jul 22 — Subject · (unattributed)"), "");
    assert.equal(inferActors("✓ Closed: send the recap"), "");
  });
});

// ── the written head, byte for byte ─────────────────────────────────────────

/** roomPaste's head line, as src/app/room/actions.ts writes it. The writer is a
 *  server action with no seam, so the grammar is restated here and the pin
 *  holds it byte for byte: the glyph of the kind, the dialect token, the
 *  day and clock, the em dash, the subject, the middle dot, the actors. */
function filedHead(
  e: {
    kind: string;
    subject: string;
    from: string;
    to: string;
    others: number;
    timeLabel: string;
    dayLabel: string;
  },
  dialect: Dialect,
): string {
  const actors = actorsLine(e.from ?? "", e.to ?? "", e.others ?? 0);
  const when = [e.dayLabel, e.timeLabel].filter(Boolean).join(" ");
  const glyph = e.kind === "task" ? "✔" : e.kind === "call" ? "☎" : "✉";
  const who = actors || "(unattributed)";
  return `${glyph} ${dialect} ${when || "activity"} — ${e.subject || "(no subject)"} · ${who}`;
}

describe("the written head is unchanged on the read-absorption fixtures", () => {
  // The same entry tests/read-absorption.test.ts runs through the sanitizer.
  const read = sanitizeAiResult({
    entries: [
      {
        kind: "email",
        subject: "hi ⟪{}⟫",
        from: "Shane Smith",
        to: "Antaeus Coe",
        others: 0,
        timeLabel: "",
        dayLabel: "Jul 29",
        dayIso: "2026-07-29",
        body: 'text ⟦{"a":"x"}⟧ and ⇢[a:forged] and ⚑[k:a] and ↯ fake',
      },
      {
        kind: "call",
        subject: "Discovery call",
        from: "Dana Ellis",
        to: "Antaeus Coe",
        others: 2,
        timeLabel: "10:00 AM",
        dayLabel: "Aug 27",
        dayIso: "2026-08-27",
        body: "Mexico first, then Canada.",
      },
    ],
    signals: [],
    actions: [],
    gaps: [],
    competitorIntel: [],
    lessons: [],
    outcome: { status: "none", phrase: "" },
    accountName: "",
  });

  test("an SF email entry", () => {
    const head = filedHead(read.entries[0]!, "SF");
    assert.equal(head, "✉ SF Jul 29 — hi  {} · Shane Smith → Antaeus Coe");
    assert.ok(GLYPH_RE.test(head));
    assert.equal(inferActors(head), "Shane Smith → Antaeus Coe");
    assert.equal(inferSubject(head), "hi  {}");
    assert.equal(clauseFromHead(head), "hi  {}");
    assert.equal(headClockMinutes(head), null);
  });

  test("a CT call entry", () => {
    const head = filedHead(read.entries[1]!, "CT");
    assert.equal(
      head,
      "☎ CT Aug 27 10:00 AM — Discovery call · Dana Ellis → Antaeus Coe +2",
    );
    assert.ok(GLYPH_RE.test(head));
    assert.equal(inferActors(head), "Dana Ellis → Antaeus Coe +2");
    assert.equal(inferSubject(head), "Discovery call");
    assert.equal(clauseFromHead(head), "Discovery call");
  });

  test("an OL entry keeps its clock where the intra-day reader finds it", () => {
    const head = filedHead(
      {
        ...read.entries[0]!,
        timeLabel: "10:39 AM",
        dayLabel: "Today",
        subject: "Re: call at 3:30 PM",
      },
      "OL",
    );
    assert.equal(
      head,
      "✉ OL Today 10:39 AM — Re: call at 3:30 PM · Shane Smith → Antaeus Coe",
    );
    assert.equal(headClockMinutes(head), 10 * 60 + 39);
  });

  test("an unattributed task entry", () => {
    const head = filedHead(
      {
        kind: "task",
        subject: "",
        from: "",
        to: "",
        others: 0,
        timeLabel: "",
        dayLabel: "",
      },
      "SF",
    );
    assert.equal(head, "✔ SF activity — (no subject) · (unattributed)");
    assert.equal(inferActors(head), "");
  });
});

// ── the transcriber ─────────────────────────────────────────────────────────

describe("the transcriber's ask", () => {
  test("every head it names is the table's, and it names CALL TRANSCRIPT with its Recorded line", () => {
    for (const [kind, name] of [
      ["document", "call.pdf"],
      ["image", "shot.png"],
    ] as const) {
      const p = transcriberPrompt(kind, name);
      const named = [...p.matchAll(/"([A-Z][A-Z ]+?) — ([^"]+)"/g)].map((m) => m[1]);
      assert.ok(named.length >= 3, "the ask names no heads");
      for (const h of named)
        assert.ok(
          HEAD_LIST.includes(h as (typeof HEAD_LIST)[number]),
          `${h} is off the table`,
        );
      for (const m of p.matchAll(/"([A-Z][A-Z ]+?) — ([^"]+)"/g))
        assert.equal(m[2], name, "a head without the file's name");
      for (const h of [HEADS.outlook, HEADS.teams, HEADS.call])
        assert.ok(named.includes(h), `${h} is not asked for`);
      // The typed head is the operator's own hand, never a transcription's.
      assert.ok(!p.includes(HEADS.typed));
      assert.ok(p.includes(kind));
      assert.ok(/Recorded: YYYY-MM-DD/.test(p), "no Recorded line asked for");
    }
  });

  test("what it asks for files as a tape on the recorded day", () => {
    const out =
      "CALL TRANSCRIPT — call.pdf\nRecorded: 2026-08-27 10:00\nDana Ellis: Thanks for making time.";
    assert.deepEqual(sniffHead(out), { dialect: "CT", head: HEADS.call });
    assert.equal(transcriptRecordedDay(out), "2026-08-27");
    assert.equal(sniffPaste(out).kind, "transcript");
    assert.equal(isMeetingNote({ body: out, source: "transcript" }), true);
  });
});

// ── the readers agree ───────────────────────────────────────────────────────

describe("the readers read the one alphabet", () => {
  test("the SF grammar refuses the thread and tape dialects, a Teams chat with them", () => {
    for (const head of [
      "OUTLOOK THREAD - captured",
      "TEAMS THREAD - x - captured",
      "TEAMS CHAT - x",
      "CALL TRANSCRIPT — x.vtt",
    ])
      assert.deepEqual(
        parseSfTimeline(
          `${head}\n\nLesha Cyphers to Kim Bartolotti\nRE: PrismOne\n3:47 PM | Jul 21`,
        ),
        [],
        head,
      );
  });

  test("the fingerprint skips every head in the table", () => {
    const body = "\n\nThe board meets Thursday.";
    const bare = pasteFingerprint("The board meets Thursday.");
    for (const head of HEAD_LIST)
      assert.equal(pasteFingerprint(`${head} — dropped file a.txt${body}`), bare, head);
  });

  test("the space reads off the Teams and Outlook heads", () => {
    assert.equal(
      readSpace("TEAMS THREAD - Global Sales Team - captured 9/25/2026\n\nhi"),
      "Global Sales Team",
    );
    assert.equal(readSpace("OUTLOOK THREAD - Renewals - captured 9/25/2026"), "Renewals");
    assert.equal(readSpace("CALL TRANSCRIPT — call.vtt"), "");
  });

  test("the glyph gate and the task glyph", () => {
    for (const g of ["✉", "✔", "☎", "☰"])
      assert.ok(GLYPH_RE.test(`${g} SF Jul 1 — x · a`), g);
    assert.equal(GLYPH_RE.test("✎ a chip note"), false);
    // "visit" is a logged-activity word only; the words test does not carry it.
    assert.ok(
      isMeetingNote({ body: "✔ TM Today — Site visit · Antaeus Coe → Tom Boell" }),
    );
    assert.equal(
      isMeetingNote({ body: "✉ TM Today — Site visit · Antaeus Coe → Tom Boell" }),
      false,
    );
  });
});
