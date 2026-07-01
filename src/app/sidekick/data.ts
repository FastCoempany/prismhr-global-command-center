import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";

export type DemoAudience = "BOTH" | "SERVICE_PROVIDER" | "DIRECT_EMPLOYER";

export type DemoAccountSummary = {
  id: string;
  name: string;
  company: string | null;
  personaLabel: string | null;
  defaultAudience: DemoAudience;
};

export type SidekickData = {
  status: "active" | "unauthenticated" | "database-unavailable";
  canWrite: boolean;
  message: string;
  accounts: DemoAccountSummary[];
  activeAccount: DemoAccountSummary | null;
  /** screenId -> note body for the active account */
  notes: Record<string, string>;
  /** pinned screen ids for the active account */
  pinnedScreenIds: string[];
};

const EMPTY: Omit<SidekickData, "status" | "canWrite" | "message"> = {
  accounts: [],
  activeAccount: null,
  notes: {},
  pinnedScreenIds: [],
};

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
  const accounts = await prisma.demoAccount.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      company: true,
      personaLabel: true,
      defaultAudience: true,
    },
  });

  const activeAccount =
    accounts.find((a) => a.id === requestedAccountId) ?? accounts[0] ?? null;

  let notes: Record<string, string> = {};
  let pinnedScreenIds: string[] = [];

  if (activeAccount) {
    const [noteRows, pinRows] = await Promise.all([
      prisma.demoNote.findMany({
        where: { accountId: activeAccount.id },
        select: { screenId: true, body: true },
      }),
      prisma.demoPin.findMany({
        where: { accountId: activeAccount.id },
        orderBy: { position: "asc" },
        select: { screenId: true },
      }),
    ]);
    notes = Object.fromEntries(noteRows.map((n) => [n.screenId, n.body]));
    pinnedScreenIds = pinRows.map((p) => p.screenId);
  }

  return {
    status: "active",
    canWrite: access.canWrite,
    message: access.message,
    accounts,
    activeAccount,
    notes,
    pinnedScreenIds,
  };
}
