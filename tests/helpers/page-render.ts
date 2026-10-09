// Render a whole page under node:test: the markup a signed-in operator's
// browser receives on first paint, with the database answered by a fake that
// holds a few rows per table. The pages the browser harness cannot mount
// (server components that read the store) reach the click-depth sweep this
// way (pass 16): the markup is handed to the browser as a static page.
//
// The session resolves to tests/helpers/fake-auth.mjs (page-hooks.mjs); the
// Prisma client is the cached global src/lib/db.ts reads, set here to a fake
// before any page imports; CSS modules and next/font resolve as room-render
// arranges.

import { register } from "node:module";
import { createElement, type ReactElement } from "react";
import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import "./room-render";

register(new URL("./page-hooks.mjs", import.meta.url));

const DAY = "2026-10-06T15:00:00.000Z";
const SIMPLOY = "001F000000w38BOIAY";

/** A few rows per table, enough that every page has something to show. */
const DATA: Record<string, Record<string, unknown>[]> = {
  intranetAsk: [
    {
      id: "ask1",
      question: "What did Simploy ask about Mexico?",
      plan: null,
      candidateIds: [SIMPLOY],
      answer: "Chassie asked how fast a hire can start in Mexico.",
      reasoning: "",
      citations: [],
      coverage: {},
      model: "brain",
      ms: 1200,
      world: "",
      askedAt: new Date(DAY),
    },
    {
      id: "ask2",
      question: "price quote for 1 employee EOR Mexico",
      plan: { priceDesk: true },
      candidateIds: [],
      answer: "[—] Priced live from the Pricing page. Open it for the figures.",
      reasoning: "",
      citations: [],
      coverage: {},
      model: "price-desk",
      ms: 3,
      world: "",
      askedAt: new Date(DAY),
    },
  ],
  intranetCapture: [
    {
      id: "cap1",
      origin: "paste",
      raw: "Chassie: can we start someone in Mexico next month?\nAntaeus: yes, two weeks.",
      rawChecksum: "c1",
      title: "Teams thread · Simploy",
      capturedAt: new Date(DAY),
      segmented: true,
      meta: null,
    },
  ],
  accountNote: [
    {
      id: "n1",
      accountId: SIMPLOY,
      partner: "Simploy",
      kind: "mine",
      body: "✉ Chassie asked for the invoices.",
      lane: "mine",
      actors: "Chassie Smith",
      recipients: "Antaeus Coe",
      source: "paste",
      door: "chute",
      filingId: null,
      createdAt: new Date(DAY),
    },
  ],
  todo: [
    {
      id: "t1",
      body: "Send the model.",
      done: true,
      accountId: SIMPLOY,
      remindAt: null,
      position: 0,
      filingId: null,
      createdAt: new Date(DAY),
      updatedAt: new Date(DAY),
    },
  ],
};

const table = (name: string) =>
  new Proxy(
    {},
    {
      get: (_t, method) => async () => {
        const rows = DATA[name] ?? [];
        switch (method) {
          case "findMany":
            return rows;
          case "count":
            return rows.length;
          case "findFirst":
          case "findUnique":
            return rows[0] ?? null;
          case "aggregate":
            return { _count: { _all: rows.length }, _max: {}, _min: {}, _sum: {} };
          default:
            return [];
        }
      },
    },
  );

const fakePrisma = new Proxy(
  {},
  {
    get: (_t, name) =>
      typeof name === "string" && !name.startsWith("$") ? table(name) : async () => [],
  },
);

(globalThis as unknown as { prisma: unknown }).prisma = fakePrisma;
process.env["DATABASE_URL"] ??= "postgres://fake.test/fake";

const SHUT = {
  appUser: null,
  authEmail: null,
  canRead: false,
  canWrite: false,
  message: "Enter the access code to continue.",
  status: "unauthenticated",
};

/** The seven pages the browser harness cannot mount, by route. The login
 *  page is read with the gate shut, as a visitor sees it; every other page
 *  as the signed-in operator does. */
export const SERVER_PAGES: {
  route: string;
  file: string;
  search?: Record<string, string>;
  shut?: boolean;
}[] = [
  { route: "/asks", file: "../../src/app/asks/page" },
  { route: "/partners", file: "../../src/app/partners/page" },
  { route: "/archive", file: "../../src/app/archive/page", search: {} },
  { route: "/demos", file: "../../src/app/demos/page" },
  { route: "/intranet/health", file: "../../src/app/intranet/health/page" },
  { route: "/intranet/pastes", file: "../../src/app/intranet/pastes/page" },
  { route: "/login", file: "../../src/app/login/page", search: {}, shut: true },
];

const stubRouter: AppRouterInstance = {
  back() {},
  forward() {},
  refresh() {},
  push() {},
  replace() {},
  prefetch() {},
};

/** The markup of a tree that may hold async server components. */
async function renderStatic(el: ReactElement): Promise<string> {
  const { prerender } = await import("react-dom/static");
  const { prelude } = await prerender(
    createElement(AppRouterContext.Provider, { value: stubRouter }, el),
  );
  const reader = prelude.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** The page's first-paint markup, as the server would send it. */
export async function renderPage(route: string): Promise<string> {
  const page = SERVER_PAGES.find((p) => p.route === route);
  if (!page) throw new Error(`no server page at ${route}`);
  const mod = (await import(page.file)) as {
    default: (props: { searchParams?: Promise<Record<string, string>> }) => Promise<ReactElement>;
  };
  (globalThis as unknown as { __fakeAccess?: unknown }).__fakeAccess = page.shut
    ? SHUT
    : undefined;
  const el = await mod.default({ searchParams: Promise.resolve(page.search ?? {}) });
  return renderStatic(el);
}
