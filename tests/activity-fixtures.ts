// Shared fixtures for the Second Record suites — CSV builders, the hostile
// fixture (§2.3 ⚔), and the 60-row golden set that pins the classifier's
// boundaries. Row shapes are drawn from the real 2026-08-20 export, names
// anonymized.

import {
  CANON_HEADERS,
  emptyActivityRow,
  type ActivityRow,
} from "../src/lib/activity/parse";

export const csvField = (v: string): string =>
  /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

export const csvLine = (r: ActivityRow): string =>
  [
    r.subject,
    r.account,
    r.id18,
    r.date,
    r.assigned,
    r.comments,
    r.lastEmailSent,
    r.lastEmailReceived,
    r.type,
    r.taskSubtype,
    r.primaryContact,
    r.lastContact,
    r.contactedDate,
    r.primaryContactTitle,
    r.recordType,
    r.callType,
    r.outreachTaskType,
    r.eventSubtype,
    r.gbc,
  ]
    .map(csvField)
    .join(",");

export const headerLine = (): string => CANON_HEADERS.join(",");

export function row(patch: Partial<ActivityRow>): ActivityRow {
  return { ...emptyActivityRow(), ...patch };
}

export const BOOK = [
  { id: "001TESTTRENDHR000A", name: "Trend Personnel" },
  { id: "001TESTSTAFFLSG00B", name: "Staff Leasing CNY" },
  { id: "001TESTBACKOFC000C", name: "Back Office Risk" },
];

// ── the hostile fixture — every §2.3 quirk at once ──────────────────────────
// A BOM; a multiline quoted comment CONTAINING a fake header line; an exact
// duplicate row; an unmatched account; a money figure in comments; a
// day-only date; escaped quotes; CRLF mixed with LF.

export function hostileCsv(): string {
  const human = row({
    subject: "Re: Global payroll question",
    account: "Trend Personnel",
    id18: "001TESTTRENDHR000A",
    date: "8/18/2026",
    assigned: "Colleague One",
    comments: `Natalie Borland wrote back.\n${headerLine()}\nShe said "yes, let's talk" — budget is $12,000 PEPM for 1,200 employees.`,
    lastEmailSent: "8/18/2026, 3:49 PM",
    lastEmailReceived: "8/19/2026, 9:02 AM",
    taskSubtype: "Email",
    primaryContact: "Natalie Borland",
    primaryContactTitle: "CFO",
    recordType: "Service Provider Task",
  });
  const dupe = human; // byte-identical → exactly one survives, one counted
  const blast = row({
    subject: "Sent A Smarter Way to Benchmark Pay",
    account: "Trend Personnel",
    id18: "001TESTTRENDHR000A",
    date: "8/12/2026",
    assigned: "Colleague One",
    taskSubtype: "Task",
    recordType: "Service Provider Task",
  });
  const opened = row({
    ...blast,
    subject: "Opened A Smarter Way to Benchmark Pay",
    date: "8/13/2026",
  });
  const machinery = row({
    subject: "Filled Out Form on Website",
    account: "Trend Personnel",
    id18: "001TESTTRENDHR000A",
    date: "8/10/2026",
    assigned: "HubSpot Integration User",
    taskSubtype: "Email",
  });
  const unmatchedRow = row({
    subject: "Call with the broker",
    account: "Advocate Pay LLC",
    id18: "001UNMATCHED00000Z",
    date: "8/11/2026",
    assigned: "Colleague Two",
    taskSubtype: "Call",
    callType: "Outbound",
    recordType: "Service Provider Task",
  });
  const support = row({
    subject: "Email: PrismHR Case 00688237: Suggested Solution [ thread::L9TrIyskd3q ]",
    account: "Staff Leasing CNY",
    id18: "001TESTSTAFFLSG00B",
    date: "8/18/2026",
    assigned: "Colleague Two",
    taskSubtype: "Email",
    recordType: "CSM Task", // rule order: the case-email form outranks CSM Task
  });
  const lines = [
    headerLine(),
    csvLine(human),
    csvLine(dupe),
    csvLine(blast).replace(/\n/g, ""),
    csvLine(opened),
    csvLine(machinery),
    csvLine(unmatchedRow),
    csvLine(support),
  ];
  // BOM up front; mixed CRLF/LF endings.
  return `﻿${lines[0]}\r\n${lines.slice(1).join("\n")}\n`;
}

// ── the golden set — 60 labeled rows pinning every rule and trap ────────────

export type GoldenCase = {
  why: string;
  r: ActivityRow;
  lane: "machinery" | "intent" | "support" | "csm" | "human";
  flags?: {
    automated?: boolean;
    inboundCall?: boolean;
    event?: boolean;
    receipt?: boolean;
  };
};

const CAMPAIGNS = [
  "[Register Now] See HR Compliance in Action",
  "See What's New in the PrismHR June 2026 Release",
  "Reach New Heights at PrismHR LIVE! 2026",
  "A Smarter Way to Benchmark Pay",
  "Leadership Update from PrismHR",
];

export function goldenSet(): GoldenCase[] {
  const out: GoldenCase[] = [];
  const base = {
    account: "Trend Personnel",
    id18: "001TESTTRENDHR000A",
    date: "8/15/2026",
  };

  // Rule 1 · machinery by assigned — including the blank-record-type family
  // measured in the real export (Email | Automated Process).
  for (const assigned of [
    "HubSpot Integration User",
    "Salesforce Administrator User",
    "Automated Process",
  ])
    for (const subject of [
      "Filled Out Form on Website",
      "Re: your inquiry",
      "List upload reconciliation",
    ])
      out.push({
        why: `machinery: ${assigned}`,
        r: row({
          ...base,
          subject,
          assigned,
          taskSubtype: "Email",
          recordType: assigned === "Automated Process" ? "" : "Service Provider Task",
        }),
        lane: "machinery",
      });

  // Rule 2 · blast receipts — the SF-generated form, subtype Task.
  for (const verb of ["Sent", "Opened", "Clicked"])
    for (const camp of CAMPAIGNS)
      out.push({
        why: `intent: ${verb}`,
        r: row({
          ...base,
          subject: `${verb} ${camp}`,
          assigned: "Colleague One",
          taskSubtype: "Task",
          recordType: "Service Provider Task",
        }),
        lane: "intent",
      });

  // THE TRAP · a human email whose subject starts "Sent …" carries subtype
  // Email and must land HUMAN (verified boundary: all 80,654 real blast rows
  // are subtype Task exactly).
  for (const subject of [
    "Sent you the deck we discussed",
    "Sent over the contract for signature",
    "Opened a ticket on your behalf",
    "Sent intro to the Mexico team",
    "Clicked with the CFO right away — recap",
  ])
    out.push({
      why: `trap: "${subject}" is a person writing`,
      r: row({
        ...base,
        subject,
        assigned: "Colleague One",
        taskSubtype: "Email",
        recordType: "Service Provider Task",
      }),
      lane: "human",
    });

  // Rule 3 · support by record type.
  for (const subject of [
    "Weekly support call",
    "Escalation review",
    "Case triage",
    "Payroll tax filing walkthrough",
    "Informer sunset questions",
  ])
    out.push({
      why: "support by record type",
      r: row({
        ...base,
        subject,
        assigned: "Colleague Two",
        taskSubtype: "Call",
        callType: "Outbound",
        recordType: "Support Call",
      }),
      lane: "support",
    });

  // Rule 4 · support by the case-email form — even logged under CSM Task
  // (rule order pins this).
  for (const n of ["00679424", "00688237", "00691102", "00693310", "00695521"])
    out.push({
      why: "case email outranks CSM Task",
      r: row({
        ...base,
        subject: `Email: PrismHR Case ${n}: New note added`,
        assigned: "Colleague Two",
        taskSubtype: "Email",
        recordType: "CSM Task",
      }),
      lane: "support",
    });

  // Rule 5 · CSM by record type; Cadence rows are CSM + automated.
  for (const subject of ["Check-in on renewal", "QBR prep", "Intro follow-through"])
    out.push({
      why: "csm by record type",
      r: row({
        ...base,
        subject,
        assigned: "Colleague Two",
        taskSubtype: "Email",
        recordType: "CSM Task",
      }),
      lane: "csm",
    });
  for (const seq of ["HR WorkCycles Sales Sequence-R", "HR WorkCycles Sales Sequence-M"])
    out.push({
      why: "cadence: automated sequence",
      r: row({
        ...base,
        subject: `Automated Email: Automated Email, 5200-900-PHR: ${seq}`,
        assigned: "Colleague Three",
        taskSubtype: "Cadence",
        recordType: "CSM Task",
      }),
      lane: "csm",
      flags: { automated: true, receipt: true },
    });

  // Engagement receipts measured hiding in human lanes: Seismic sessions and
  // submitted forms — flagged, never motion.
  for (const subject of [
    "[Seismic] [Session] Rachael Brown viewed PrismHR Live2026 - PEO Industry Update",
    "[Seismic] Thank You for Joining PrismLIVE & the Executive Forum",
  ])
    out.push({
      why: "seismic receipt",
      r: row({
        ...base,
        subject,
        assigned: "Colleague Two",
        taskSubtype: "Task",
        recordType: "CSM Task",
      }),
      lane: "csm",
      flags: { receipt: true },
    });
  out.push({
    why: "submitted form receipt",
    r: row({
      ...base,
      subject: "Submitted Form 'Default - Access Request'",
      assigned: "Colleague One",
      taskSubtype: "Task",
      recordType: "Service Provider Task",
    }),
    lane: "human",
    flags: { receipt: true },
  });

  // Rule 7 · human motion: emails, calls (inbound flag), events, Sales Task.
  for (const subject of [
    "Re: Partner Introduction ~ Zayzoon | TrendHR",
    "PrismLive! Tax Offering Discussion",
    "Intro: global payroll conversation",
    "Re: Canada payroll win-back",
    "Philippines proposal follow-through",
    "Re: EOR platform demo scheduling",
    "Notes from the pipeline meeting",
    "Re: reseller agreement redlines",
  ])
    out.push({
      why: "human email",
      r: row({
        ...base,
        subject,
        assigned: "Colleague One",
        taskSubtype: "Email",
        recordType: "Service Provider Task",
      }),
      lane: "human",
    });
  out.push({
    why: "inbound call flag",
    r: row({
      ...base,
      subject: "They called about the demo",
      assigned: "Colleague One",
      taskSubtype: "Call",
      callType: "Inbound",
      recordType: "Service Provider Task",
    }),
    lane: "human",
    flags: { inboundCall: true },
  });
  for (const subject of ["Called the CFO", "Left word with the controller"])
    out.push({
      why: "outbound call",
      r: row({
        ...base,
        subject,
        assigned: "Colleague One",
        taskSubtype: "Call",
        callType: "Outbound",
        recordType: "Service Provider Task",
      }),
      lane: "human",
    });
  out.push({
    why: "event",
    r: row({
      ...base,
      subject: "PrismHR LIVE dinner",
      assigned: "Colleague One",
      taskSubtype: "",
      eventSubtype: "Event",
      recordType: "Default",
    }),
    lane: "human",
    flags: { event: true },
  });
  out.push({
    why: "sales task record type falls through to human",
    r: row({
      ...base,
      subject: "Follow up on pricing conversation",
      assigned: "Colleague One",
      taskSubtype: "Task",
      recordType: "Sales Task",
    }),
    lane: "human",
  });

  return out;
}
