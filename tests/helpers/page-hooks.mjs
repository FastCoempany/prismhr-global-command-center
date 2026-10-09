// A module hook for rendering whole pages under node:test: the session
// module resolves to its fake (fake-auth.mjs), since no request is in flight.
// Registered by tests/helpers/page-render.ts only; every other suite sees the
// real module.
export async function resolve(specifier, context, next) {
  const r = await next(specifier, context);
  if (/\/src\/lib\/auth\.ts$/.test(r.url))
    return { url: new URL("./fake-auth.mjs", import.meta.url).href, shortCircuit: true };
  return r;
}
