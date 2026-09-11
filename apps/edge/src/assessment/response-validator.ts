import type { RiskLevel } from '@checkcare/shared-types'
import type { MedPsyOutput } from '../qvac/medpsy.js'
import { isKnownSourceId } from '../qvac/rag.js'
import { logger } from '../logger.js'

/**
 * Response Validator (master prompt section 22).
 *
 * Runs deterministically against MedPsy's structured output before it is
 * ever shown to a user. Nothing here calls an LLM — pattern matching only,
 * so it is fully unit-testable and cannot itself be prompt-injected.
 */

export type ViolationCategory = 'diagnosis' | 'prescription' | 'false_certainty' | 'risk_contradiction' | 'unverified_source'

export interface ValidationViolation {
  category: ViolationCategory
  field: string
  excerpt: string
}

export interface ValidationResult {
  passed: boolean
  violations: ValidationViolation[]
}

const DIAGNOSIS_PATTERNS: RegExp[] = [
  /\byou\s+(have|'ve got|have got)\b/i,
  /\byou\s*('re| are)\s+suffering from\b/i,
  /\bthis is\s+(definitely|certainly|clearly)\s+\w+/i,
  /\bit'?s\s+(definitely|certainly|clearly)\s+\w+/i,
  // Self-diagnosis claims only — NOT a bare match on "diagnose", which also
  // appears in correct, safe deferrals like "only a doctor can diagnose you".
  /\byou\s*('re| are)\s+diagnosed with\b/i,
  /\bI\s+diagnose\b/i,
  /\b(this|that)\s+is\s+diagnosed\s+as\b/i,
  /\b(my|your)\s+diagnosis\s+is\b/i
]

const PRESCRIPTION_PATTERNS: RegExp[] = [
  /\btake\s+(this|the following|\d+)?\s*(medication|medicine|drug|antibiotic|dose|pill)/i,
  /\b\d+\s?(mg|mcg|ml|milligrams?|micrograms?)\b/i,
  /\bstop\s+(taking|your)\s+(medication|medicine)\b/i,
  /\bprescri(be|ption|bed|bing)\b/i,
  /\byou should (take|start|stop) \w+/i
]

const FALSE_CERTAINTY_PATTERNS: RegExp[] = [
  /\bdefinitely\b/i,
  /\bcertainly\b/i,
  /\byou\s*('re| are)\s+(completely\s+)?fine\b/i,
  /\bnothing to worry about\b/i,
  /\byou\s*('re| are)\s+(completely\s+)?healthy\b/i,
  /\bno need to (see|worry|visit)\b/i,
  /\bthere'?s nothing (wrong|serious)\b/i
]

const HOME_ONLY_PATTERNS: RegExp[] = [/\bmonitor at home\b/i, /\bwait and see\b/i, /\bstay (at )?home\b/i, /\bno need (for|to see) (a doctor|medical|professional|emergency)\b/i]

const ESCALATION_PATTERNS: RegExp[] = [
  /\bemergency\b/i,
  /\b(999|911|112)\b/i,
  /\burgent(ly)?\b/i,
  /\bimmediately\b/i,
  /\bright away\b/i,
  /\bprofessional\b/i,
  /\bdoctor\b/i,
  /\bhospital\b/i,
  /\bA&E\b/i,
  /\ber\b/i,
  /\bcall\b/i
]

function scanField(field: string, text: string, patterns: RegExp[], category: ViolationCategory, violations: ValidationViolation[]) {
  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) {
      violations.push({ category, field, excerpt: match[0] })
    }
  }
}

export function validateMedPsyOutput(output: MedPsyOutput, riskLevel: RiskLevel): ValidationResult {
  const violations: ValidationViolation[] = []

  const textFields: Array<[string, string]> = [
    ['summary', output.summary],
    ...output.warningSigns.map((s, i): [string, string] => [`warningSigns[${i}]`, s]),
    ...output.recommendedNextSteps.map((s, i): [string, string] => [`recommendedNextSteps[${i}]`, s]),
    ...output.uncertainty.map((s, i): [string, string] => [`uncertainty[${i}]`, s])
  ]

  for (const [field, text] of textFields) {
    scanField(field, text, DIAGNOSIS_PATTERNS, 'diagnosis', violations)
    scanField(field, text, PRESCRIPTION_PATTERNS, 'prescription', violations)
    scanField(field, text, FALSE_CERTAINTY_PATTERNS, 'false_certainty', violations)
  }

  // Risk precedence check: an EMERGENCY/URGENT case whose next-steps text
  // recommends home-only management with no escalation language at all is
  // a contradiction of the Safety Engine's determination and must be
  // rejected outright (master prompt section 14).
  if (riskLevel === 'EMERGENCY' || riskLevel === 'URGENT') {
    const combined = [output.summary, ...output.recommendedNextSteps].join(' ')
    const hasHomeOnly = HOME_ONLY_PATTERNS.some((p) => p.test(combined))
    const hasEscalation = ESCALATION_PATTERNS.some((p) => p.test(combined))
    if (hasHomeOnly && !hasEscalation) {
      violations.push({ category: 'risk_contradiction', field: 'recommendedNextSteps', excerpt: combined.slice(0, 120) })
    }
    if (!hasEscalation) {
      violations.push({ category: 'risk_contradiction', field: 'recommendedNextSteps', excerpt: '(no escalation language found for EMERGENCY/URGENT case)' })
    }
  }

  const passed = violations.length === 0
  if (!passed) {
    logger.warn('response_validator_rejected', {
      riskLevel,
      violationCount: violations.length,
      categories: violations.map((v) => v.category).join(',')
    })
  }

  return { passed, violations }
}

/** Confirms every source id referenced actually exists in the knowledge base manifest. */
export async function validateSourceIds(sourceIds: string[]): Promise<ValidationResult> {
  const violations: ValidationViolation[] = []
  for (const id of sourceIds) {
    const known = await isKnownSourceId(id)
    if (!known) {
      violations.push({ category: 'unverified_source', field: 'sources', excerpt: id })
    }
  }
  return { passed: violations.length === 0, violations }
}
