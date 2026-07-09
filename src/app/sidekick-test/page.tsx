import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { demoContext, demoMeta, demoModules, demoScreens } from "@/lib/catalog-demo";
import { applyDemoOverrides, loadSidekickTest } from "./data";
import { SidekickTestClient } from "./sidekick-test-client";

export const dynamic = "force-dynamic";

export default async function SidekickTestPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const pick = (k: string) => {
    const v = params[k];
    return typeof v === "string" ? v : undefined;
  };

  const data = await loadSidekickTest(pick("account"));

  if (data.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="New Sidekick Test" />
        <main className="app-main">
          <p>
            {data.message} <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  const { screens, editedIds } = applyDemoOverrides(demoScreens, data.overrides);

  return (
    <>
      <AppWayfinder current="New Sidekick Test" />
      <SidekickTestClient
        meta={demoMeta}
        modules={demoModules}
        screens={screens}
        context={demoContext}
        accounts={data.accounts}
        activeAccount={data.activeAccount}
        notes={data.notes}
        editedIds={editedIds}
        canWrite={data.canWrite}
        dbUnavailable={data.status === "database-unavailable"}
        initialScreenId={pick("screen")}
        justSaved={pick("saved") === "1"}
      />
    </>
  );
}
