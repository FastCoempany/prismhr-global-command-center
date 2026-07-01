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

## Note on this environment
`prisma generate` and `next build` could not be run in the cloud session that authored
this because the egress policy blocks Prisma's engine-binary CDN. Type-checking showed no
genuine errors in the sidekick code — only the expected "generated client not present"
cascade, which resolves the moment `prisma generate` runs locally.

## Not yet wired (intentional next steps)
- Playbooks UI (models exist) — ordered demo sequences per account.
- In-app script editing (currently scripts come from the markdown catalog).
- Screenshot-beside-script (PNGs live on the capture machine; add an image host/path).
