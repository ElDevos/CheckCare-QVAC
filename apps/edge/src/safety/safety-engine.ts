import type {
  QuestionAnswer,
  RiskLevel,
  SafetyEvaluation,
  SafetyRule,
  SymptomEntry
} from '@checkcare/shared-types'
import { maxRisk } from '@checkcare/shared-types'
import { RULES, RULES_VERSION } from './rules.js'
import { logger } from '../logger.js'

/**
 * Deterministic Safety Engine.
 *
 * CRITICAL (master prompt sections 13/14): this module contains NO calls to
 * MedPsy or any LLM. It is pure, synchronous, and fully unit-testable. Its
 * output is the floor for the final risk level — see
 * assessment/assessment-engine.ts, which combines this with MedPsy's
 * narrative but never lets MedPsy lower what this function returns.
 */

export interface SafetyEngineInput {
  symptoms: SymptomEntry[]
  answers: QuestionAnswer[]
  durationDays: number
  freeText?: string
}

const POISON_KEYWORDS = ['poison', 'veneno', 'toxic', 'tóxic', 'overdose', 'sobredosis']

function matches(rule: SafetyRule, input: SafetyEngineInput): boolean {
  const symptomKeys = new Set(input.symptoms.map((s) => s.key))
  const matcher = rule.matcher

  switch (matcher.type) {
    case 'symptomPresent':
      return symptomKeys.has(matcher.symptom)

    case 'symptomCombo':
      return matcher.symptoms.every((s) => symptomKeys.has(s))

    case 'answerEquals': {
      const answer = input.answers.find((a) => a.questionId === matcher.questionId)
      return answer !== undefined && answer.value === matcher.equals
    }

    case 'answerIn': {
      const answer = input.answers.find((a) => a.questionId === matcher.questionId)
      return answer !== undefined && matcher.oneOf.includes(answer.value)
    }

    case 'durationExceeds':
      return symptomKeys.has(matcher.symptom) && input.durationDays > matcher.days

    case 'freeTextFlag': {
      if (!input.freeText) return false
      const lower = input.freeText.toLowerCase()
      return matcher.keywords.some((kw) => lower.includes(kw.toLowerCase()))
    }

    default:
      return false
  }
}

/**
 * Evaluates all safety rules against the given input and returns the
 * highest-severity match, or MONITOR if nothing triggered. Pure function —
 * same input always produces same output, no I/O, no randomness.
 */
export function evaluateSafety(input: SafetyEngineInput): SafetyEvaluation {
  const triggered: SafetyRule[] = []

  for (const rule of RULES) {
    if (matches(rule, input)) triggered.push(rule)
  }

  // Free-text poisoning mention is an always-on cross-cutting check, not
  // tied to a specific symptom selection.
  if (input.freeText) {
    const lower = input.freeText.toLowerCase()
    if (POISON_KEYWORDS.some((kw) => lower.includes(kw)) && !triggered.some((r) => r.id === 'rule-possible-poisoning')) {
      const poisonRule = RULES.find((r) => r.id === 'rule-possible-poisoning')
      if (poisonRule) triggered.push(poisonRule)
    }
  }

  let riskLevel: RiskLevel = 'MONITOR'
  for (const rule of triggered) {
    riskLevel = maxRisk(riskLevel, rule.severity)
  }
  // Any symptom set with no triggered EMERGENCY/URGENT rule but that a
  // clinician would still want reviewed goes to PROFESSIONAL_EVALUATION
  // when duration or intensity signals persistence. This keeps MONITOR
  // reserved for genuinely unremarkable, short, non-red-flag cases.
  if (riskLevel === 'MONITOR' && input.durationDays >= 5) {
    riskLevel = 'PROFESSIONAL_EVALUATION'
  }

  if (triggered.length > 0) {
    logger.info('safety_engine_triggered', {
      riskLevel,
      ruleCount: triggered.length,
      ruleIds: triggered.map((r) => r.id).join(',')
    })
  }

  return {
    riskLevel,
    triggeredRules: triggered.map((r) => ({
      id: r.id,
      version: r.version,
      description: r.description,
      descriptionEs: r.descriptionEs,
      severity: r.severity,
      source: r.source,
      sourceUrl: r.sourceUrl
    }))
  }
}

export { RULES_VERSION }
