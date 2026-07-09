import catalog from "./catalog.json";

// The demo catalog is generated from a real recorded demo (see
// tools/sidekick-import). It reuses the Sidekick screen shape and adds
// flow order + a timestamp back to the source recording.
export type DemoScreen = {
  id: string;
  title: string;
  module: string;
  type: string;
  tier: "high" | "medium" | "low";
  navPath: string[];
  children: string[];
  tags: string[];
  elements: { name: string; actions: string[] }[];
  what: string;
  capabilities: string[];
  sp: string[];
  de: string[];
  branching: string[];
  say: string;
  flowOrder: number;
  videoStartSec: number;
  videoClock: string; // "HH:MM:SS" into the recording
  videoEndClock: string;
  confidence: "high" | "medium" | "low";
  needsFrameCheck: string | null;
};

export type DemoModuleEntry = [key: string, label: string];

export type DemoContext = {
  id: string;
  title: string;
  facts: string[];
  videoClock: string;
};

export const demoMeta = catalog.meta as { source: string; note: string; flowCount: number };
export const demoModules = catalog.modules as DemoModuleEntry[];
export const demoContext = catalog.context as DemoContext[];

// Always presented in flow order — the sequence the demo was actually run in.
export const demoScreens = (catalog.screens as DemoScreen[])
  .slice()
  .sort((a, b) => a.flowOrder - b.flowOrder);

const byId = new Map(demoScreens.map((s) => [s.id, s]));

export function getDemoScreen(id: string): DemoScreen | undefined {
  return byId.get(id);
}

export function demoModuleLabel(key: string): string {
  return demoModules.find(([k]) => k === key)?.[1] ?? key;
}
