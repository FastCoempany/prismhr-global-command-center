import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { modules, screens as baseScreens } from "@/lib/catalog";
import { applyOverrides, loadSidekick } from "./data";
import { SidekickClient } from "./sidekick-client";

export const dynamic = "force-dynamic";

export default async function SidekickPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const pick = (k: string) => {
    const v = params[k];
    return typeof v === "string" ? v : undefined;
  };

  const data = await loadSidekick(pick("account"));

  if (data.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Demo Sidekick" />
        <main className="app-main">
          <p>
            {data.message} <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  const { screens, editedIds } = applyOverrides(baseScreens, data.overrides);

  return (
    <>
      <AppWayfinder current="Demo Sidekick" />
      <SidekickClient
        modules={modules}
        screens={screens}
        accounts={data.accounts}
        activeAccount={data.activeAccount}
        notes={data.notes}
        pinnedScreenIds={data.pinnedScreenIds}
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
