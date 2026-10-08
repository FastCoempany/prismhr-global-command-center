// next/font/google under node:test. Next's compiler swaps each font call for
// a generated stylesheet at build time; the package itself ships an empty
// module, so a page that loads a font at module scope cannot be imported by
// the suite without this. Each font hands back the shape the compiler would:
// a class name, a CSS variable name and a style. Registered by css-hooks.mjs.

const font =
  (family) =>
  (opts = {}) => ({
    className: `font-${family}`,
    variable: opts.variable ?? `--font-${family}`,
    style: { fontFamily: family },
  });

export const DM_Serif_Display = font("DM Serif Display");
export const JetBrains_Mono = font("JetBrains Mono");
export const Public_Sans = font("Public Sans");
