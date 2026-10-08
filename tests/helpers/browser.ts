// A real browser for the faces (pass 11). The server render (room-render.ts)
// reads markup; what it cannot read is the stylesheet's effect and a click.
// This harness bundles a fixture with esbuild, mounts it in headless
// Chromium (the one the container ships: PLAYWRIGHT_BROWSERS_PATH) with the
// app's own stylesheets, and hands the suite a page to measure, hover and
// click. Each CSS module is scoped to its file, as Next scopes it, so two
// sheets that both name `.door` never collide. Server actions are stubbed:
// each call is recorded on window.__calls, so a test reads what a click
// asked the server to do, and window.__returns answers it.

import { build, type Plugin } from "esbuild";
import { chromium, type Browser, type Page } from "playwright-core";
import { readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const ROOT = process.cwd();
const ORIGIN = "http://faces.test";

// ── the stylesheets ─────────────────────────────────────────────────────────

/** A CSS file with its @imports inlined; Tailwind's own import is dropped
 *  (the faces under test style themselves through their modules and the
 *  tokens). */
function inlined(file: string, seen = new Set<string>()): string {
  if (seen.has(file)) return "";
  seen.add(file);
  const css = readFileSync(file, "utf8");
  return css.replace(/@import\s+["']([^"']+)["'];?/g, (_m, spec: string) =>
    spec.startsWith(".") ? inlined(resolve(dirname(file), spec), seen) : "",
  );
}

/** The app's global sheet with the tokens, and the font variables the root
 *  layout's next/font calls declare (src/app/layout.tsx). The room's own
 *  (src/app/room/page.tsx) ride a class its fixture sets on the frame, as the
 *  page sets them on its main, so a sheet that leans on them elsewhere shows. */
const GLOBAL_CSS = (): string =>
  `:root{--font-donor-serif:"DM Serif Display";--font-donor-sans:"Public Sans";--font-donor-mono:"JetBrains Mono";}.harness-room-fonts{--f-serif:"DM Serif Display";--f-sans:"Public Sans";--f-mono:"JetBrains Mono";}\n` +
  inlined(join(ROOT, "src/app/globals.css"));

/** One CSS module, scoped: every class the file defines becomes
 *  `<file>__<class>`, `composes:` folds into the class map, and the sheet's
 *  text is rewritten to match. */
export function scopeModule(
  file: string,
  css: string,
): { map: Record<string, string>; css: string } {
  const prefix = basename(file).replace(/\.module\.css$/, "").replace(/\W/g, "_");
  const names = new Set<string>();
  for (const m of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) names.add(m[1]);
  const scoped = (n: string) => `${prefix}__${n}`;
  const map: Record<string, string> = {};
  for (const n of names) map[n] = scoped(n);
  // composes: the rule's own class carries the composed ones too.
  const body = css.replace(
    /\.(-?[_a-zA-Z][\w-]*)\s*\{([^}]*)\}/g,
    (whole, cls: string, decls: string) => {
      const comp = /composes:\s*([^;]+);/.exec(decls);
      if (!comp) return whole;
      const extra = comp[1].trim().split(/\s+/).map(scoped);
      map[cls] = [scoped(cls), ...extra].join(" ");
      return whole.replace(comp[0], "");
    },
  );
  const out = body.replace(/\.(-?[_a-zA-Z][\w-]*)/g, (m, n: string, at: number, s: string) =>
    // A dot inside a number or a url is not a class.
    /[\d\w/]/.test(s[at - 1] ?? "") ? m : `.${scoped(n)}`,
  );
  return { map, css: out };
}

// ── the bundle ──────────────────────────────────────────────────────────────

const STUB_LINK = `
import { createElement } from "react";
export default function Link({ href, children, prefetch, replace, scroll, ...rest }) {
  const to = typeof href === "string" ? href : (href?.pathname ?? "") + (href?.search ?? "");
  return createElement("a", { href: to, ...rest }, children);
}`;
const STUB_NAV = `
const router = { refresh(){ (window.__refreshes ||= []).push(1); }, push(){}, replace(){}, back(){}, forward(){}, prefetch(){} };
export function useRouter(){ return router; }
export function usePathname(){ return location.pathname; }
export function useSearchParams(){ return new URLSearchParams(window.__search || ""); }
export function redirect(){}
export function notFound(){}`;

/** Every export of a "use server" module, as a recorded stub. */
function serverStub(src: string): string {
  const names = new Set<string>();
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s+const\s+(\w+)/g)) names.add(m[1]);
  return [...names]
    .map(
      (n) =>
        `export async function ${n}(...args) { (window.__calls ||= []).push([${JSON.stringify(n)}, args]); const r = (window.__returns || {})[${JSON.stringify(n)}]; return r === undefined ? { ok: true } : r; }`,
    )
    .join("\n");
}

// What only the server runs: the database client, the model SDK and Node's
// own modules. A face's bundle can reach them through a shared library (the
// queue's day.ts, say) that the browser never calls into; each resolves to
// an inert proxy so the bundle builds and nothing in it can reach a store.
const SERVER_ONLY =
  /^(node:.*|fs|path|util|util\/types|stream|net|tls|crypto|os|events|dns|url|module|async_hooks|buffer|child_process|worker_threads|zlib|http|https|pg|pg-.*|pgpass|@prisma\/.*|@anthropic-ai\/.*|@\/generated\/prisma.*|@\/lib\/db)$/;
const INERT = `
const inert = new Proxy(function () {}, {
  get: (_t, k) => (k === Symbol.toPrimitive ? () => "" : k === "then" ? undefined : inert),
  apply: () => inert,
  construct: () => inert,
});
module.exports = inert;`;

function plugins(sheets: Map<string, string>): Plugin[] {
  return [
    {
      name: "faces",
      setup(b) {
        b.onResolve({ filter: SERVER_ONLY }, (a) => ({ path: a.path, namespace: "inert" }));
        b.onLoad({ filter: /.*/, namespace: "inert" }, () => ({ contents: INERT, loader: "js" }));
        b.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "stub" }));
        b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "nav", namespace: "stub" }));
        b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => ({
          contents: a.path === "link" ? STUB_LINK : STUB_NAV,
          loader: "jsx",
          resolveDir: ROOT,
        }));
        b.onLoad({ filter: /\.module\.css$/ }, (a) => {
          const { map, css } = scopeModule(a.path, readFileSync(a.path, "utf8"));
          sheets.set(a.path, css);
          return { contents: `export default ${JSON.stringify(map)};`, loader: "js" };
        });
        b.onLoad({ filter: /\/src\/.*\.(ts|tsx)$/ }, (a) => {
          const src = readFileSync(a.path, "utf8");
          if (!/^\s*(\/\/[^\n]*\n|\s)*["']use server["']/.test(src)) return undefined;
          return { contents: serverStub(src), loader: "js" };
        });
      },
    },
  ];
}

const cache = new Map<string, { js: string; css: string }>();

/** The fixture bundled for the browser: its default export is a component
 *  that renders the face under test with its props. */
export async function bundle(fixture: string): Promise<{ js: string; css: string }> {
  const at = resolve(ROOT, fixture);
  const hit = cache.get(at);
  if (hit) return hit;
  const sheets = new Map<string, string>();
  const out = await build({
    stdin: {
      contents: `import { createElement } from "react";
import { createRoot } from "react-dom/client";
import Fixture from ${JSON.stringify(at)};
createRoot(document.getElementById("root")).render(createElement(Fixture));`,
      resolveDir: ROOT,
      loader: "tsx",
    },
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    tsconfig: join(ROOT, "tsconfig.json"),
    define: { "process.env.NODE_ENV": '"production"' },
    banner: { js: "var process = { env: { NODE_ENV: 'production' } };" },
    plugins: plugins(sheets),
    logLevel: "silent",
  });
  const got = { js: out.outputFiles[0].text, css: [...sheets.values()].join("\n") };
  cache.set(at, got);
  return got;
}

// ── the page ────────────────────────────────────────────────────────────────

export async function openBrowser(): Promise<Browser> {
  return chromium.launch({ headless: true });
}

export type MountOptions = {
  /** What useSearchParams reads. */
  search?: string;
  /** Answers for the stubbed server actions, by name. */
  returns?: Record<string, unknown>;
  /** localStorage before the fixture mounts. */
  storage?: Record<string, string>;
  /** The clock the page reads, as an ISO moment. */
  now?: string;
  reducedMotion?: boolean;
  /** Answers for the page's own GETs, by path: the evidence route, say. */
  routes?: Record<string, (url: URL) => unknown>;
  viewport?: { width: number; height: number };
};

/** A fresh page with the fixture mounted and its effects settled. */
export async function mount(
  browser: Browser,
  fixture: string,
  opts: MountOptions = {},
): Promise<Page> {
  const { js, css } = await bundle(fixture);
  const page = await browser.newPage({
    viewport: opts.viewport ?? { width: 1400, height: 900 },
    reducedMotion: opts.reducedMotion ? "reduce" : "no-preference",
  });
  if (opts.now) await page.clock.setFixedTime(new Date(opts.now));
  // What the fixture reads before it mounts: the search, the actions'
  // answers and the stored state. Set in the page itself, ahead of the
  // bundle (an init script does not run for setContent).
  const seed = JSON.stringify({
    search: opts.search ?? "",
    returns: opts.returns ?? {},
    storage: opts.storage ?? {},
  }).replace(/</g, "\\u003c");
  const boot = `(() => { const s = ${seed}; window.__search = s.search; window.__returns = s.returns; window.__calls = []; for (const [k, v] of Object.entries(s.storage)) localStorage.setItem(k, v); })();`;
  // A real origin, so localStorage works: the page is served from a routed
  // address that never leaves the browser.
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${GLOBAL_CSS()}\n${css}</style><script>${boot}</script></head><body><div id="root"></div><script>${js.replace(/<\/script/g, "<\\/script")}</script></body></html>`;
  const asked: string[] = [];
  requests.set(page, asked);
  await page.route(`${ORIGIN}/**`, (r) => {
    const url = new URL(r.request().url());
    if (url.pathname === "/")
      return r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html });
    asked.push(`${r.request().method()} ${url.pathname}${url.search}`);
    const answer = opts.routes?.[url.pathname];
    return answer
      ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(answer(url)) })
      : r.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}/`, { waitUntil: "load" });
  await page.waitForFunction(() => (document.getElementById("root")?.childElementCount ?? 0) > 0);
  await page.waitForTimeout(30);
  return page;
}

const requests = new WeakMap<Page, string[]>();

/** The page's own requests past the first load, as "METHOD /path?query". */
export const requestsOf = (page: Page): string[] => requests.get(page) ?? [];

/** The server actions the page called, in order. */
export async function callsOf(page: Page): Promise<[string, unknown[]][]> {
  return page.evaluate(() => (window as unknown as { __calls: [string, unknown[]][] }).__calls);
}

/** A module's scoped class, as the page carries it. */
export const cls = (sheet: string, name: string): string =>
  `.${basename(sheet).replace(/\.module\.css$/, "").replace(/\W/g, "_")}__${name}`;

export { relative };
