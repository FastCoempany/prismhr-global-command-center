# Demo Sidekick (in-app)

The Demo Sidekick is now a real feature of this Next.js app (route **`/sidekick`**),
not just the standalone HTML mockup. It's your account-based, server-persisted demo
companion.

## What it does
- **Account-based demoing** — pick the prospect you're demoing to; **notes and pins are
  scoped to that account** and stored in Postgres (not local storage), so they survive
  refreshes, machine changes, and browsers.
- **Per-account, per-screen notes** — jot notes on any screen for the active account; saved
  server-side via a server action.
- **Pinned screens** — pin the shortlist you'll show a given prospect; they sit at the top.
- **Presenter mode** — press **P** (or ▶ Presenter) for a big-text, distraction-free view of
  the talk track. **Esc** to exit.
- **Command palette** — **⌘K / Ctrl+K** to jump to any of the 76 screens.
- **Keyboard nav** — `/` focus search, `↑`/`↓` move between screens, `P` presenter, `⌘K` palette.
- **Audience toggle** — Service Provider ⇄ Direct Employer (defaults from the account's persona).
- **"What to click here" checklist** and **"Where you can go from here"** jump-links.

## Architecture
- **Catalog** (the 76 screens) is compiled from `docs/demo-catalog/entries/*.md` into
  `src/lib/catalog/catalog.json` by `tools/build-catalog.mjs`. Re-run after editing entries:
  ```bash
  node tools/build-catalog.mjs
  ```
  The app imports it via `src/lib/catalog` (static, versioned in git — no DB needed to read scripts).
- **Persistence** (mutable, per-account) is Postgres via Prisma. New models:
  `DemoAccount`, `DemoNote`, `DemoPin`, `DemoPlaybook`, `DemoPlaybookItem`
  (migration `prisma/migrations/20260701120000_demo_sidekick`).
- **Server** — `src/app/sidekick/{page,data,actions}.ts`; **UI** — `sidekick-client.tsx` + CSS module.
- Auth reuses the existing owner access-code model; writes require the OWNER session.

## Run it locally
```bash
npm install                       # (the pinned toolchain)
# ensure .env.local has DATABASE_URL / DIRECT_URL (Supabase Postgres)
npx prisma migrate deploy         # applies the demo_sidekick migration
npm run prisma:generate           # generate the Prisma client
npm run dev                       # open http://localhost:3000/sidekick
```

## Deploy
Standard for this app (e.g. Vercel): set `DATABASE_URL`/`DIRECT_URL`, run
`prisma migrate deploy` on release, `npm run build`. The `/sidekick` page is
`force-dynamic` and guards on `hasDatabaseEnv()`, so builds don't need a live DB.

## Build verification
Verified end-to-end: `tsc --noEmit` passes with **0 errors** and `next build` compiles
successfully with `/sidekick` in the route table.

### Prisma engine / restricted networks
Runtime uses the **WASM query engine** (`engineType = "client"` + `@prisma/adapter-pg`),
so **no native query-engine binary ships to production** — smaller, faster serverless cold
starts. The only native binary is the CLI's schema-engine, used by `generate`/`migrate`.

In a network-restricted sandbox, Prisma's Node downloader ignores `HTTPS_PROXY` and its
direct fetch of `binaries.prisma.sh` is reset by the egress firewall (while `curl`, which
honors the proxy, succeeds). Workaround for such environments:
```bash
source tools/prisma-engine-bootstrap.sh   # curl-fetches schema-engine, sets env
npx prisma generate                        # or: npx prisma migrate deploy
```
On a normal laptop / CI / Vercel, none of this is needed — `npm run build` just works.

## Playbooks
Ordered demo sequences per account. In the sidebar, pick/create a **Playbook**, then
**＋ Add current screen** to append screens; reorder with ↑/↓ and remove with ✕. When a
playbook is active, a **◀ n/total ▶ stepper** appears in the top bar so you can walk the
planned sequence during a call. Stored in `DemoPlaybook` / `DemoPlaybookItem`.

## In-app script editing
Click **✎ Edit script** on any screen to edit the talk track, capabilities, per-audience
value, branching, and "what this screen is" — saved to `DemoScreenOverride` and layered over
the static catalog (`applyOverrides`). Edits are **global** (every account sees the improved
script); an **edited** chip marks overridden screens and **↺ Reset to catalog** clears the
override. The markdown catalog remains the source of truth for anything not overridden.

## Screenshot beside the script
Each screen shows `public/demo-screens/<screenId>.png` if present (graceful fallback if not).
Populate it locally from your capture output:
```bash
node tools/collect-screenshots.mjs   # copies capture PNGs → public/demo-screens/<id>.png
```
The PNGs are git-ignored (large); regenerate per machine. Text/a11y stay the catalog source.
