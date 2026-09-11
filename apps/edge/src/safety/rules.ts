// Re-exported so apps/edge/src/safety/* has a local, stable import surface
// even though the actual versioned rule data lives in the standalone
// @checkcare/safety-rules package (kept separate so it can be reviewed,
// tested, and versioned independently of the edge runtime — see
// packages/safety-rules/src/rules.ts).
export { RULES, RULES_VERSION, getRulesForSymptom } from '@checkcare/safety-rules'
