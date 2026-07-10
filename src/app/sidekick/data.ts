import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import type { Screen } from "@/lib/catalog";

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

export type SidekickData = {
  status: "active" | "unauthenticated" | "database-unavailable";
  canWrite: boolean;
  message: string;
  accounts: DemoAccountSummary[];
  activeAccount: DemoAccountSummary | null;
  notes: Record<string, string>;
  pinnedScreenIds: string[];
  playbooks: PlaybookData[];
  overrides: ScreenOverride[];
};

const EMPTY = {
  accounts: [],
  activeAccount: null,
  notes: {},
  pinnedScreenIds: [],
  playbooks: [],
  overrides: [],
} satisfies Omit<SidekickData, "status" | "canWrite" | "message">;

/** Layer editable overrides over the static catalog. */
export function applyOverrides(
  base: Screen[],
  overrides: ScreenOverride[],
): { screens: Screen[]; editedIds: string[] } {
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

export async function loadSidekick(requestedAccountId?: string): Promise<SidekickData> {
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
  let pinnedScreenIds: string[] = [];
  let playbooks: PlaybookData[] = [];

  if (activeAccount) {
    const [noteRows, pinRows, playbookRows] = await Promise.all([
      prisma.demoNote.findMany({
        where: { accountId: activeAccount.id },
        select: { screenId: true, body: true },
      }),
      prisma.demoPin.findMany({
        where: { accountId: activeAccount.id },
        orderBy: { position: "asc" },
        select: { screenId: true },
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
    notes = Object.fromEntries(noteRows.map((n) => [n.screenId, n.body]));
    pinnedScreenIds = pinRows.map((p) => p.screenId);
    // v3 Sidekick namespaces its playbooks with a "v3:" name prefix — keep
    // them out of this app's dropdown (and it keeps ours out of its own).
    playbooks = playbookRows.filter((p) => !p.name.startsWith("v3:"));
  }

  return {
    status: "active",
    canWrite: access.canWrite,
    message: access.message,
    accounts,
    activeAccount,
    notes,
    pinnedScreenIds,
    playbooks,
    overrides: overrideRows,
  };
}
