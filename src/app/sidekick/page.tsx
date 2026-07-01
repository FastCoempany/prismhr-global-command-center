import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { modules, screens } from "@/lib/catalog";
import { loadSidekick } from "./data";
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
        canWrite={data.canWrite}
        dbUnavailable={data.status === "database-unavailable"}
        initialScreenId={pick("screen")}
        justSaved={pick("saved") === "1"}
      />
    </>
  );
}
