import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { flowScreens, v3Companion, v3MasterFlow } from "@/lib/sidekick-v3";
import { applyV3Overrides, loadSidekickV3 } from "./data";
import { SidekickV3Client } from "./sidekick-v3-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "v3 Sidekick",
};

export default async function SidekickV3Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const pick = (k: string) => {
    const v = params[k];
    return typeof v === "string" ? v : undefined;
  };

  const data = await loadSidekickV3(pick("account"));

  if (data.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="v3 Sidekick" />
        <main className="app-main">
          <p>
            {data.message} <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  const { screens, editedIds } = applyV3Overrides(
    flowScreens(v3MasterFlow),
    data.overrides,
  );

  return (
    <>
      <AppWayfinder current="v3 Sidekick" />
      <SidekickV3Client
        flow={v3MasterFlow}
        screens={screens}
        companion={v3Companion}
        accounts={data.accounts}
        activeAccount={data.activeAccount}
        notes={data.notes}
        playbooks={data.playbooks}
        editedIds={editedIds}
        canWrite={data.canWrite}
        dbUnavailable={data.status === "database-unavailable"}
        initialScreenId={pick("screen")}
        initialPlaybookId={pick("pb")}
        justSaved={pick("saved") === "1"}
      />
    </>
  );
}
