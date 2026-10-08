// Module hooks for the suite: a CSS module resolves to what a bundler hands
// the component — a map of the stylesheet's own class names, and undefined
// for any class the sheet does not define — and next/font/google resolves to
// a stub of what the compiler hands a page. Registered by tests/helpers/
// room-render.ts so a client component can be imported and rendered under
// node:test.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, next) {
  // A font loader resolves to the stub the compiler's output stands in for
  // (next-font-stub.mjs), so a page module can be imported whole.
  if (specifier === "next/font/google") {
    return { url: new URL("./next-font-stub.mjs", import.meta.url).href, shortCircuit: true };
  }
  if (/\.css$/.test(specifier) && context.parentURL) {
    return { url: new URL(specifier, context.parentURL).href, shortCircuit: true };
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (/\.css$/.test(url)) {
    const css = readFileSync(fileURLToPath(url), "utf8");
    const names = new Set();
    for (const m of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) names.add(m[1]);
    const map = Object.fromEntries([...names].map((n) => [n, n]));
    return {
      format: "module",
      shortCircuit: true,
      source: `export default ${JSON.stringify(map)};`,
    };
  }
  return next(url, context);
}
