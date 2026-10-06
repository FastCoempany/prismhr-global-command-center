// Render the HomeRoom's client components under node:test. The CSS-module
// hook (css-hooks.mjs) is registered here, so every component module must be
// imported through the loaders below — a static import would resolve its
// stylesheet before the hook exists. What comes back is the markup the
// operator's browser would receive on first paint; the suites read that, never
// a source file.

import { register } from "node:module";
import { createElement, type ReactElement } from "react";
import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import type {
  CadenceRow,
  CheckinRow,
  FollowUpRow,
  RoomRow,
  WarmRow,
} from "../../src/app/room/room-client";

register(new URL("./css-hooks.mjs", import.meta.url));

export const roomClient = () => import("../../src/app/room/room-client");
export const chute = () => import("../../src/app/room/chute");
export const captureShelf = () => import("../../src/app/intake/capture-shelf");
// The held box and the receipt every door paints (slice 18a).
export const held = () => import("../../src/app/room/ingest/held");
export const receipt = () => import("../../src/app/room/ingest/receipt");

// The doors ask the router for the fresh read after a filing (useRouter from
// next/navigation, in the shared door hooks); under renderToStaticMarkup no
// App Router is mounted, and the hook throws without one. A stub stands in
// for first paint: it never navigates and its refresh is a no-op.
const stubRouter: AppRouterInstance = {
  back() {},
  forward() {},
  refresh() {},
  push() {},
  replace() {},
  prefetch() {},
};

export async function render(el: ReactElement): Promise<string> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  return renderToStaticMarkup(
    createElement(AppRouterContext.Provider, { value: stubRouter }, el),
  );
}

/** The operator-facing text of a render: tags gone, entities read back. */
export function textOf(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Every <form> in a render, whole. */
export function formsOf(html: string): string[] {
  return html.match(/<form[\s\S]*?<\/form>/g) ?? [];
}

/** Every class token a render asks for. A CSS module hands back undefined for
 *  a class the sheet does not define, so a dangling reference reads
 *  "undefined" here. */
export function classesOf(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/class="([^"]*)"/g)) out.push(...m[1].split(/\s+/));
  return out.filter(Boolean);
}

export function roomRow(over: Partial<RoomRow> = {}): RoomRow {
  return {
    accountId: "001F000000w38BOIAY",
    theirs: null,
    cardId: "card-simploy",
    name: "Simploy",
    meta: "EOR · PH",
    shape: "Shaping up to be EOR",
    multiTone: "y",
    people: [{ name: "Chassie Smith", line: "VP Operations · 2 threads" }],
    briefed: false,
    briefedManual: null,
    sfUrl: null,
    climb: { frac: 0.4, capTone: "ok", label: "needs analysis", why: ["demo booked"] },
    stages: [
      { key: "investigate", label: "Investigate", state: "done", items: [], judgment: "" },
      {
        key: "first_meeting",
        label: "First meeting",
        state: "cur",
        items: [{ item: "Book the room", checked: false, note: "", index: 0 }],
        judgment: "",
      },
    ],
    suggestions: [],
    move: "Send the model.",
    moveFull: "",
    thin: false,
    outstanding: null,
    sheetOpen: [{ id: "todo-1", body: "Send the model." }],
    sheetRest: [],
    sheetDelayed: [{ id: "todo-2", body: "Call the CSM.", when: "tomorrow" }],
    sheetDoneToday: [{ id: "todo-3", body: "Book the demo.", at: "9:10 AM" }],
    record: [{ id: "n1", t: "9/25", text: "✉ Chassie asked for the invoices.", struck: false }],
    recordTotal: 1,
    backgroundTotal: 0,
    loss: null,
    owed: [],
    outcome: null,
    gaps: [],
    gapsQueued: 0,
    peers: [],
    askHref: "/intranet?q=Simploy",
    researchAt: "",
    health: "amber",
    rank: 1,
    workedToday: false,
    canWrite: true,
    ...over,
  };
}

export function cadenceRow(over: Partial<CadenceRow> = {}): CadenceRow {
  return {
    partner: "Lesha Cyphers",
    subjectKey: "roundup:lesha",
    status: "none",
    lastSent: "",
    daysAgo: null,
    due: true,
    muted: false,
    opener: "Hi Lesha,",
    closer: "Thanks,",
    sections: [{ id: "s1", name: "Simploy", bullet: "Demo booked Monday.", on: true }],
    total: 1,
    ...over,
  };
}

export function checkinRow(over: Partial<CheckinRow> = {}): CheckinRow {
  return {
    subjectKey: "outreach:001simploy",
    label: "Simploy",
    ask: "the signed order form",
    quietDays: 4,
    kind: "partner",
    ...over,
  };
}

export function followUpRow(over: Partial<FollowUpRow> = {}): FollowUpRow {
  return {
    subjectKey: "manual:abc-123",
    label: "chase Acme Logistics about their Brazil hires",
    armedAt: "2026-09-25T15:00:00Z",
    filed: ["Simploy"],
    newName: "Acme Logistics",
    ...over,
  };
}

export function warmRow(over: Partial<WarmRow> = {}): WarmRow {
  return {
    id: "001F000000w38OHIAY",
    name: "Regis HR Group",
    why: "Opened the pricing page twice this week.",
    seedNote: "Regis HR Group — warming",
    ...over,
  };
}
