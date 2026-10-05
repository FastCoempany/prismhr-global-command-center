"use server";

// The router's door (the Chute brains refactor plan, §2.4 and slice 7).
// Routing runs on the server and the roster never ships to the browser
// (ruled 2026-09-25, D12 — CLAUDE.md, The Chute): a door hands the text
// here, the joined roster is read on the server (src/lib/ingest/route.ts),
// and what goes back is the verdict — the best account and the candidates,
// each with its rung and its why — and the picker's names. Names may
// travel; emails, domains and people never do.

import { getAppAccess } from "@/lib/auth";
import { peos } from "@/lib/book";
import { routeText as route } from "@/lib/ingest/route";
import type { RouteHit } from "@/lib/route-capture";

export type BookName = { id: string; name: string };

export type RouteReply = {
  best: RouteHit | null;
  candidates: RouteHit[];
  /** Every account the book knows, by name, for the picker. */
  book: BookName[];
  /** Set when the session may not route: no verdict and no names. */
  refused?: string;
};

const bookNames = (): BookName[] => peos.map((p) => ({ id: p.id, name: p.name }));

async function allowed(): Promise<boolean> {
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

/** The picker's names for a door that needs them before any route: the
 *  second record's drop, and a pick that came back after a reload. */
export async function chuteBook(): Promise<BookName[]> {
  return (await allowed()) ? bookNames() : [];
}

export async function routeText(text: string): Promise<RouteReply> {
  if (!(await allowed()))
    return { best: null, candidates: [], book: [], refused: "Read-only session." };
  const { best, candidates } = await route(typeof text === "string" ? text : "");
  return { best, candidates, book: bookNames() };
}
