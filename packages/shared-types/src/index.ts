/**
 * CheckCare shared types.
 *
 * These types are the contract between the edge runtime, the safety engine,
 * the response validator, and the web UI. RiskLevel intentionally excludes
 * any "safe / healthy / nothing wrong" value — see docs/safety.md for why.
 */

/** Deterministic escalation levels. Never widen this to include reassurance values. */
export type RiskLevel = 'EMERGENCY' | 'URGENT' | 'PROFESSIONAL_EVALUATION' | 'MONITOR'

export const RISK_LEVEL_ORDER: Record<RiskLevel, number> = {
  EMERGENCY: 3,
  URGENT: 2,
  PROFESSIONAL_EVALUATION: 1,
  MONITOR: 0
}

/** True if `a` is a strictly higher (more severe) risk level than `b`. */
export function isHigherRisk(a: RiskLevel, b: RiskLevel): boolean {
  return RISK_LEVEL_ORDER[a] > RISK_LEVEL_ORDER[b]
}

/** Returns the more severe of two risk levels. */
export function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_LEVEL_ORDER[a] >= RISK_LEVEL_ORDER[b] ? a : b
}

export type Severity = 'EMERGENCY' | 'URGENT'

/** A single, versioned, source-backed safety rule. Never invent criteria here. */
export interface SafetyRule {
  id: string
  version: string
  description: string
  descriptionEs: string
  severity: Severity
  /** Symptom keys (see packages/safety-rules/src/symptom-keys.ts) that can trigger this rule. */
  appliesToSymptoms: string[]
  /** Deterministic predicate metadata evaluated by the safety engine — see rules.ts. */
  matcher: SafetyRuleMatcher
  source: string
  sourceUrl: string
}

export type SafetyRuleMatcher =
  | { type: 'symptomPresent'; symptom: string }
  | { type: 'symptomCombo'; symptoms: string[] }
  | { type: 'answerEquals'; questionId: string; equals: string | boolean }
  | { type: 'answerIn'; questionId: string; oneOf: Array<string | boolean> }
  | { type: 'durationExceeds'; symptom: string; days: number }
  | { type: 'freeTextFlag'; symptom: 'other'; keywords: string[] }

export interface SafetyEvaluation {
  riskLevel: RiskLevel
  triggeredRules: Array<Pick<SafetyRule, 'id' | 'version' | 'description' | 'descriptionEs' | 'severity' | 'source' | 'sourceUrl'>>
}

export interface SourceReference {
  id: string
  title: string
  source: string
  url: string
  topic: string
}

export interface AssessmentResult {
  riskLevel: RiskLevel
  summary: string
  warningSigns: string[]
  recommendedNextSteps: string[]
  questionsToMonitor: string[]
  uncertainty: string[]
  sources: SourceReference[]
  disclaimer: string
}

export interface SymptomEntry {
  key: string
  label: string
  custom?: boolean
}

export interface SymptomInput {
  symptoms: SymptomEntry[]
  durationDays: number
  intensity: 'mild' | 'moderate' | 'severe'
  evolution: 'improving' | 'same' | 'worsening'
  freeText?: string
}

export interface AdaptiveQuestion {
  id: string
  text: string
  textEs: string
  type: 'boolean' | 'single-select' | 'scale'
  options?: Array<{ value: string; label: string; labelEs: string }>
}

export interface QuestionAnswer {
  questionId: string
  value: string | boolean
}

export type ModelStatus = 'NOT_INSTALLED' | 'LOADING' | 'READY' | 'BUSY' | 'ERROR' | 'UNLOADING'

export interface ModelInfo {
  name: string
  quantization: string
  runtime: string
  backend: string
  execution: 'local'
  remoteAI: 'none'
  approxSizeBytes: number
  contextLength: number
  installedAt: string | null
  status: ModelStatus
}

export interface BenchmarkRecord {
  timestamp: string
  device: string
  os: string
  architecture: string
  model: string
  quantization: string
  modelLoadTimeMs: number
  inputTokens: number
  outputTokens: number
  timeToFirstTokenMs: number
  generationTimeMs: number
  tokensPerSecond: number
  backendDevice: string
}

export interface AssessmentRecord {
  id: string
  createdAt: string
  symptoms: SymptomEntry[]
  durationDays: number
  intensity: string
  evolution: string
  answers: QuestionAnswer[]
  riskLevel: RiskLevel
  result: AssessmentResult
  modelVersion: string
  safetyRuleVersion: string
  parentAssessmentId?: string | null
}

export interface FollowUpInput {
  assessmentId: string
  status: 'better' | 'same' | 'worse'
  newSymptoms?: SymptomEntry[]
  notes?: string
}
