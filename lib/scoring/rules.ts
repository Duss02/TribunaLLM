export const RULES_VERSION = "rules-v1";

// Chosen before any data was collected, not fitted. The band between
// `unsupported` and `supported` is left alone on purpose: a sentence there is
// neither struck nor scored.
export const THRESHOLDS = {
  claim: 0.5,
  contradicted: 0.7,
  supported: 0.7,
  unsupported: 0.35,
  rebuts: 0.7,
  offMotion: 0.35,
  evidenceUse: 1.5,
} as const;

export const POINTS = {
  supported: 1,
  unsupported: -1,
  contradicted: -2,
  rebuts: 1,
  offMotion: -1,
  evidenceUse: 1,
  judgeScale: 3,
} as const;

export const DRAW_MARGIN = 0.5;
