import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

let cachedConfig: unknown;

export function readHmlRulesConfig<TConfig = unknown>() {
  if (cachedConfig) return cachedConfig as TConfig;

  const rulesPath = path.join(process.cwd(), "config", "hml-rules.yaml");
  cachedConfig = YAML.parse(fs.readFileSync(rulesPath, "utf8"));
  return cachedConfig as TConfig;
}
