import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { V3_PLAYBOOK_PREFIX, v3ScreenIds, type V3Screen } from "@/lib/sidekick-v3";

// v3 reuses the existing Demo* tables. Every row it writes is keyed by a v3
// screen id ("pgd-…"), which never collides with the original catalog's
// numeric ids ("001"…), so the two Sidekicks can't touch each other's data.

export type DemoAudience = "BOTH" | "SERVICE_PROVIDER" | "DIRECT_EMPLOYER";

export type DemoAccountSummary = {
  id: string;
  name: string;
  company: string | null;
  personaLabel: string | null;
  defaultAudience: DemoAudience;
};

export type PlaybookData = {
  id: string;
  name: string;
  items: { id: string; screenId: string }[];
};

export type ScreenOverride = {
  screenId: string;
  say: string | null;
  what: string | null;
  capabilities: string[];
  sp: string[];
  de: string[];
  branching: string[];
};

export type SidekickV3Data = {
  status: "active" | "unauthenticated" | "database-unavailable";
  canWrite: boolean;
  message: string;
  accounts: DemoAccountSummary[];
  activeAccount: DemoAccountSummary | null;
  notes: Record<string, string>;
  playbooks: PlaybookData[];
  overrides: ScreenOverride[];
};

const EMPTY = {
  accounts: [],
  activeAccount: null,
  notes: {},
  playbooks: [],
  overrides: [],
} satisfies Omit<SidekickV3Data, "status" | "canWrite" | "message">;

/** Layer editable overrides over the static screen store. */
export function applyV3Overrides(
  base: V3Screen[],
  overrides: ScreenOverride[],
): { screens: V3Screen[]; editedIds: string[] } {
  const map = new Map(overrides.map((o) => [o.screenId, o]));
  const screens = base.map((s) => {
    const o = map.get(s.id);
    if (!o) return s;
    return {
      ...s,
      say: o.say ?? s.say,
      what: o.what ?? s.what,
      capabilities: o.capabilities.length ? o.capabilities : s.capabilities,
      sp: o.sp.length ? o.sp : s.sp,
      de: o.de.length ? o.de : s.de,
      branching: o.branching.length ? o.branching : s.branching,
    };
  });
  return { screens, editedIds: overrides.map((o) => o.screenId) };
}

export async function loadSidekickV3(
  requestedAccountId?: string,
): Promise<SidekickV3Data> {
  const access = await getAppAccess();

  if (access.status !== "active" || !hasDatabaseEnv()) {
    return {
      ...EMPTY,
      status: access.status === "active" ? "database-unavailable" : access.status,
      canWrite: false,
      message: access.message,
    };
  }

  const prisma = getPrisma();
  try {
    const [accounts, overrideRows] = await Promise.all([
      prisma.demoAccount.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          company: true,
          personaLabel: true,
          defaultAudience: true,
        },
      }),
      prisma.demoScreenOverride.findMany({
        select: {
          screenId: true,
          say: true,
          what: true,
          capabilities: true,
          sp: true,
          de: true,
          branching: true,
        },
      }),
    ]);

    const activeAccount =
      accounts.find((a) => a.id === requestedAccountId) ?? accounts[0] ?? null;

    let notes: Record<string, string> = {};
    let playbooks: PlaybookData[] = [];

    if (activeAccount) {
      const [noteRows, playbookRows] = await Promise.all([
        prisma.demoNote.findMany({
          where: { accountId: activeAccount.id },
          select: { screenId: true, body: true },
        }),
        prisma.demoPlaybook.findMany({
          where: { accountId: activeAccount.id },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            items: {
              orderBy: { position: "asc" },
              select: { id: true, screenId: true },
            },
          },
        }),
      ]);
      // Only v3-namespaced rows reach this client — never the other Sidekick's.
      notes = Object.fromEntries(
        noteRows.filter((n) => v3ScreenIds.has(n.screenId)).map((n) => [n.screenId, n.body]),
      );
      // Only v3-namespaced playbooks — legacy /sidekick playbooks never show
      // here (and v3 actions refuse to mutate them). Prefix stripped for display.
      playbooks = playbookRows
        .filter((p) => p.name.startsWith(V3_PLAYBOOK_PREFIX))
        .map((p) => ({
          ...p,
          name: p.name.slice(V3_PLAYBOOK_PREFIX.length),
          items: p.items.filter((it) => v3ScreenIds.has(it.screenId)),
        }));
    }

    return {
      status: "active",
      canWrite: access.canWrite,
      message: access.message,
      accounts,
      activeAccount,
      notes,
      playbooks,
      overrides: overrideRows.filter((o) => v3ScreenIds.has(o.screenId)),
    };
  } catch {
    return {
      ...EMPTY,
      status: "database-unavailable",
      canWrite: false,
      message: access.message,
    };
  }
}
