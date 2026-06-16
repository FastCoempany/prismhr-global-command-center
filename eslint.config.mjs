import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const ignoredPaths = [
  ".next/**",
  "node_modules/**",
  "src/generated/**",
  "generated/**",
  "coverage/**",
  "dist/**",
  "build/**",
];

const eslintConfig = [
  {
    ignores: ignoredPaths,
  },
  ...nextVitals,
  ...nextTypescript,
];

export default eslintConfig;
