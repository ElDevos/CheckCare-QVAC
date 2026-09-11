import type { AdaptiveQuestion, SymptomEntry } from '@checkcare/shared-types'
import { QUESTIONS } from '@checkcare/safety-rules'

/**
 * Deterministic adaptive-question selection (master prompt section 12).
 *
 * Given the symptoms a user selected, returns the subset of the fixed
 * question catalog relevant to those symptoms — no LLM involved. Two users
 * with the same symptom selection always get the same question set.
 */
export function selectQuestions(symptoms: SymptomEntry[]): AdaptiveQuestion[] {
  const symptomKeys = new Set(symptoms.map((s) => s.key))
  const relevant = QUESTIONS.filter((q) => q.triggerSymptoms.some((s) => symptomKeys.has(s)))

  // Cap at 8 questions so the flow stays short even when a user selects
  // many symptoms; prioritize questions tied to more of the selected
  // symptoms (more likely to be clinically relevant to this specific case).
  const scored = relevant
    .map((q) => ({
      q,
      score: q.triggerSymptoms.filter((s) => symptomKeys.has(s)).length
    }))
    .sort((a, b) => b.score - a.score)

  const selected = scored.slice(0, 8).map((s) => s.q)

  return selected.map(({ id, text, textEs, type, options }) => ({ id, text, textEs, type, options }))
}
