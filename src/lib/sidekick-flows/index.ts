import prismhrGlobalMasterDemoFlowJson from "./prismhr-global-master-demo-flow.v1.json";

// A curated, account-neutral guided demo flow distilled from a recorded demo
// (Zoom recording + dense frame review). Read-only reference data — nothing
// here touches the database or the editable Sidekick catalog.

export type FlowScreen = {
  id: string;
  title: string;
  sourceMoments: number[];
  timestampStart: string;
  timestampEnd: string;
  screenType: string;
  visualSummary: string;
  demoPurpose: string;
  recommendedSidekickModule: string;
  keepOrCut: string;
  suggestedScreenshotFrame: { clock: string; approxFile: string };
  transcriptAnchor: string;
  say: string;
  what: string;
  capabilities: string[];
  sp: string[];
  de: string[];
  branching: string[];
};

export type FlowCut = {
  moments: string;
  range: string;
  disposition: string;
  keepOrCut: string;
  reason: string;
};

export type SidekickFlow = {
  version: string;
  name: string;
  status: string;
  notes: Record<string, string>;
  screens: FlowScreen[];
  cuts: FlowCut[];
};

export const prismhrGlobalMasterDemoFlow: SidekickFlow = {
  version: prismhrGlobalMasterDemoFlowJson.version,
  name: prismhrGlobalMasterDemoFlowJson.name,
  status: prismhrGlobalMasterDemoFlowJson.status,
  notes: prismhrGlobalMasterDemoFlowJson.notes,
  screens: prismhrGlobalMasterDemoFlowJson.screens as FlowScreen[],
  cuts: prismhrGlobalMasterDemoFlowJson.cuts as FlowCut[],
};
