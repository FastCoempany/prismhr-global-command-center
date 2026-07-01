import catalog from "./catalog.json";

export type ScreenElement = {
  name: string;
  actions: string[];
};

export type Screen = {
  id: string;
  title: string;
  module: string;
  type: string;
  tier: "high" | "medium" | "low";
  navPath: string[];
  children: string[];
  tags: string[];
  elements: ScreenElement[];
  what: string;
  capabilities: string[];
  sp: string[];
  de: string[];
  branching: string[];
  say: string;
};

export type ModuleEntry = [key: string, label: string];

export const modules = catalog.modules as ModuleEntry[];
export const screens = catalog.screens as Screen[];

const byId = new Map(screens.map((s) => [s.id, s]));

export function getScreen(id: string): Screen | undefined {
  return byId.get(id);
}

export function moduleLabel(key: string): string {
  return modules.find(([k]) => k === key)?.[1] ?? key;
}

// Resolve a children_frontier label to a real screen (loose title match), so
// "where you can go from here" links can navigate.
export function resolveChild(label: string): Screen | undefined {
  const l = label.toLowerCase();
  return screens.find(
    (s) => l.includes(s.title.toLowerCase()) || s.title.toLowerCase().includes(l),
  );
}
