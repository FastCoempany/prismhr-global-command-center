import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { demoScreens, type DemoScreen } from "@/lib/catalog-demo";

// The new (test) Sidekick reuses the existing Demo* tables for editing, but
// every row it writes is keyed by a demo screen id (e.g. "screen-07-…"), which
// never collides with the original catalog's numeric ids ("001"…). So editing
// here can't touch the existing Sidekick, and no new tables are needed.

export type DemoAudience = "BOTH" | "SERVICE_PROVIDER" | "DIRECT_EMPLOYER";

export type DemoAccountSummary = {
  id: string;
  name: string;
  company: string | null;
  personaLabel: string | null;
  defaultAudience: DemoAudience;
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

export type SidekickTestData = {
  status: "active" | "unauthenticated" | "database-unavailable";
  canWrite: boolean;
  message: string;
  accounts: DemoAccountSummary[];
  activeAccount: DemoAccountSummary | null;
  notes: Record<string, string>;
  overrides: ScreenOverride[];
};

const EMPTY = { accounts: [], activeAccount: null, notes: {}, overrides: [] };

// Layer editable overrides over the generated demo catalog.
export function applyDemoOverrides(
  base: DemoScreen[],
  overrides: ScreenOverride[],
): { screens: DemoScreen[]; editedIds: string[] } {
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
  return {
    screens,
    editedIds: overrides.filter((o) => map.has(o.screenId)).map((o) => o.screenId),
  };
}

const DEMO_IDS = new Set(demoScreens.map((s) => s.id));

export async function loadSidekickTest(
  requestedAccountId?: string,
): Promise<SidekickTestData> {
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
    if (activeAccount) {
      const noteRows = await prisma.demoNote.findMany({
        where: { accountId: activeAccount.id },
        select: { screenId: true, body: true },
      });
      // Only this catalog's notes (id-namespaced) — never the other Sidekick's.
      notes = Object.fromEntries(
        noteRows.filter((n) => DEMO_IDS.has(n.screenId)).map((n) => [n.screenId, n.body]),
      );
    }

    return {
      status: "active",
      canWrite: access.canWrite,
      message: access.message,
      accounts,
      activeAccount,
      notes,
      // Only overrides for this catalog's ids reach the client.
      overrides: overrideRows.filter((o) => DEMO_IDS.has(o.screenId)),
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
