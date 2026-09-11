import type { AssessmentResult, QuestionAnswer, RiskLevel, SafetyEvaluation, SourceReference, SymptomInput } from '@checkcare/shared-types'
import { evaluateSafety } from '../safety/safety-engine.js'
import { RULES_VERSION } from '../safety/rules.js'
import { retrieveContext } from '../qvac/rag.js'
import { runMedPsy, type MedPsyOutput, type MedPsyRunResult } from '../qvac/medpsy.js'
import { validateMedPsyOutput, validateSourceIds } from './response-validator.js'
import { getQuestionById } from '@checkcare/safety-rules'
import { logger } from '../logger.js'

export const DISCLAIMER =
  'CheckCare es una herramienta educativa y de orientación. No proporciona diagnósticos médicos y no sustituye la evaluación de un profesional de la salud. Ante una emergencia, busca servicios de emergencia apropiados de inmediato.'

const MAX_MEDPSY_ATTEMPTS = 2

export interface AssessmentRunResult {
  result: AssessmentResult
  safety: SafetyEvaluation
  modelUsed: boolean
  medPsyStats: MedPsyRunResult['stats'] | null
}

function buildRagQuery(symptoms: SymptomInput, answers: QuestionAnswer[]): string {
  const symptomLabels = symptoms.symptoms.map((s) => s.label).join(', ')
  const affirmed = answers
    .filter((a) => a.value === true)
    .map((a) => getQuestionById(a.questionId)?.text)
    .filter((t): t is string => Boolean(t))
    .join('. ')
  return [symptomLabels, symptoms.freeText, affirmed].filter(Boolean).join('. ')
}

/**
 * Deterministic, LLM-free fallback used when MedPsy is unavailable or its
 * output fails validation twice in a row (master prompt section 35 — the
 * app must degrade gracefully, never show a stack trace or a rejected
 * response). The fallback still respects the Safety Engine's risk level.
 */
function buildFallbackOutput(riskLevel: RiskLevel, sources: SourceReference[]): MedPsyOutput {
  const sourceNote = sources.length > 0 ? ' Consulta las fuentes citadas para más contexto.' : ''
  const byRisk: Record<RiskLevel, MedPsyOutput> = {
    EMERGENCY: {
      summary: `Se identificaron señales que pueden requerir atención inmediata. CheckCare no pudo generar una explicación ampliada de forma fiable esta vez, así que se muestra la evaluación de seguridad determinística.${sourceNote}`,
      warningSigns: [],
      recommendedNextSteps: ['Busca atención médica de emergencia de inmediato (servicios de emergencia locales).', 'No esperes a que los síntomas empeoren para pedir ayuda.'],
      questionsToMonitor: [],
      uncertainty: ['Esta es una orientación automatizada de respaldo, no una evaluación completa.']
    },
    URGENT: {
      summary: `Se identificaron señales que justifican una evaluación profesional prioritaria. CheckCare no pudo generar una explicación ampliada de forma fiable esta vez.${sourceNote}`,
      warningSigns: [],
      recommendedNextSteps: ['Busca evaluación profesional de salud lo antes posible (mismo día si es posible).'],
      questionsToMonitor: ['Si los síntomas empeoran repentinamente, busca atención de emergencia.'],
      uncertainty: ['Esta es una orientación automatizada de respaldo, no una evaluación completa.']
    },
    PROFESSIONAL_EVALUATION: {
      summary: `La información proporcionada justifica considerar una evaluación profesional.${sourceNote}`,
      warningSigns: [],
      recommendedNextSteps: ['Considera programar una consulta con un profesional de la salud.'],
      questionsToMonitor: ['Observa si aparecen nuevas señales de alerta.'],
      uncertainty: ['Esta es una orientación automatizada de respaldo, no una evaluación completa.']
    },
    MONITOR: {
      summary: `No se identificaron señales de alerta con la información proporcionada. Vigila la evolución de tus síntomas.${sourceNote}`,
      warningSigns: [],
      recommendedNextSteps: ['Descansa, mantente hidratado y observa la evolución de los síntomas.'],
      questionsToMonitor: ['Busca ayuda si aparecen señales de alerta o los síntomas empeoran.'],
      uncertainty: ['Esta es una orientación automatizada de respaldo, no una evaluación completa.']
    }
  }
  return byRisk[riskLevel]
}

export async function runAssessment(input: {
  symptoms: SymptomInput
  answers: QuestionAnswer[]
}): Promise<AssessmentRunResult> {
  const { symptoms, answers } = input

  // 1. Deterministic Safety Engine — runs first, always, no LLM.
  const safety = evaluateSafety({
    symptoms: symptoms.symptoms,
    answers,
    durationDays: symptoms.durationDays,
    freeText: symptoms.freeText
  })

  // 2. RAG retrieval — grounds MedPsy, and is the ONLY source of `sources`.
  const query = buildRagQuery(symptoms, answers)
  const retrieved = await retrieveContext(query, 4)

  // 3. MedPsy, with validation + one retry + deterministic fallback.
  let medPsyOutput: MedPsyOutput | null = null
  let medPsyStats: MedPsyRunResult['stats'] | null = null
  let modelUsed = false

  for (let attempt = 1; attempt <= MAX_MEDPSY_ATTEMPTS; attempt++) {
    try {
      const run = await runMedPsy({ symptoms, answers, retrievedContext: retrieved.sources, riskLevel: safety.riskLevel })
      const validation = validateMedPsyOutput(run.output, safety.riskLevel)
      if (validation.passed) {
        medPsyOutput = run.output
        medPsyStats = run.stats
        modelUsed = true
        break
      }
      logger.warn('medpsy_output_rejected_retry', { attempt, violations: validation.violations.length })
    } catch (err) {
      logger.error('medpsy_run_failed', { attempt, error: err instanceof Error ? err.message : String(err) })
    }
  }

  if (!medPsyOutput) {
    medPsyOutput = buildFallbackOutput(safety.riskLevel, retrieved.sources)
    modelUsed = false
  }

  // 4. Defense-in-depth: confirm every source id is real.
  const sourceValidation = await validateSourceIds(retrieved.sources.map((s) => s.id))
  const safeSources = sourceValidation.passed
    ? retrieved.sources
    : retrieved.sources.filter((s) => !sourceValidation.violations.some((v) => v.excerpt === s.id))

  // 5. Compose final result. riskLevel comes ONLY from the Safety Engine —
  //    MedPsy's output type has no riskLevel field, so it structurally
  //    cannot override this (master prompt section 14).
  const warningSigns = [
    ...safety.triggeredRules.map((r) => r.descriptionEs),
    ...medPsyOutput.warningSigns
  ]

  const result: AssessmentResult = {
    riskLevel: safety.riskLevel,
    summary: medPsyOutput.summary,
    warningSigns,
    recommendedNextSteps: medPsyOutput.recommendedNextSteps,
    questionsToMonitor: medPsyOutput.questionsToMonitor,
    uncertainty: medPsyOutput.uncertainty,
    sources: safeSources,
    disclaimer: DISCLAIMER
  }

  logger.info('assessment_complete', {
    riskLevel: result.riskLevel,
    modelUsed,
    sourceCount: safeSources.length,
    safetyRuleVersion: RULES_VERSION
  })

  return { result, safety, modelUsed, medPsyStats }
}
