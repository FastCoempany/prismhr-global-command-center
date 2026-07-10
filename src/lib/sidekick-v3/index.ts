import screensJson from "./screens.json";
import flowsJson from "./flows.json";
import companionJson from "./companion.json";
import { modules as catalogModules, type ModuleEntry } from "@/lib/catalog";

// v3 Sidekick data layer — ONE canonical screen store; flows are ordered
// references into it (never copies). Everything here is account-neutral and
// grounded in a recorded demo; per-account material lives in the Demo* tables.

export type V3Screen = {
  id: string;
  title: string;
  module: string;
  screenType: string;
  timestampStart: string;
  timestampEnd: string;
  sourceMoments: number[];
  suggestedScreenshotFrame: { clock: string; approxFile: string };
  transcriptAnchor: string;
  visualSummary: string;
  demoPurpose: string;
  say: string;
  what: string;
  capabilities: string[];
  sp: string[];
  de: string[];
  branching: string[];
};

export type V3Flow = {
  id: string;
  title: string;
  version: string;
  description: string;
  screenIds: string[];
};

export type V3Objection = {
  objection: string;
  response: string;
  relatedScreenId: string;
};

export type V3Companion = {
  discoveryBrief: { title: string; sourceNote: string; prompts: string[] };
  objections: { title: string; sourceNote: string; items: V3Objection[] };
  followUps: { title: string; sourceNote: string; items: string[] };
};

// Durable namespace for v3-owned DemoPlaybook rows (the table has no app
// column). Stored in the name, stripped for display; mutations refuse rows
// without it, so the two Sidekicks can't touch each other's playbooks.
export const V3_PLAYBOOK_PREFIX = "v3:";

export const v3Screens = screensJson.screens as V3Screen[];
export const v3Flows = flowsJson.flows as V3Flow[];
export const v3Companion = companionJson as unknown as V3Companion;

export const v3MasterFlow = v3Flows[0];

const byId = new Map(v3Screens.map((s) => [s.id, s]));

export function getV3Screen(id: string): V3Screen | undefined {
  return byId.get(id);
}

export const v3ScreenIds = new Set(v3Screens.map((s) => s.id));

// Module lens over the same store — reuses the real catalog module labels.
export const v3Modules: ModuleEntry[] = catalogModules.filter(([key]) =>
  v3Screens.some((s) => s.module === key),
);

export function v3ModuleLabel(key: string): string {
  return catalogModules.find(([k]) => k === key)?.[1] ?? key;
}

// Screens in master-flow order (the default presentation order).
export function flowScreens(flow: V3Flow): V3Screen[] {
  return flow.screenIds
    .map((id) => byId.get(id))
    .filter((s): s is V3Screen => Boolean(s));
}

// Where a curated screenshot lands once extracted locally
// (tools/sidekick-import/extract-flow-frames.mjs → public/demo-screens/v3/).
export function v3ScreenshotPath(id: string): string {
  return `/demo-screens/v3/${id}.jpg`;
}
