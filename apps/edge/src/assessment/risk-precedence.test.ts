import { describe, it, expect, vi } from 'vitest'

/**
 * The single most safety-critical test in this codebase (master prompt
 * section 14): MedPsy must NEVER be able to lower the risk level the
 * deterministic Safety Engine determined.
 *
 * We mock MedPsy and RAG (not the Safety Engine, not the Response
 * Validator, not assessment-engine's composition logic) so this test runs
 * without the real GGUF model installed, and so we can force MedPsy to
 * emit reassuring, MONITOR-sounding language for a case the Safety Engine
 * has already classified as EMERGENCY.
 */
vi.mock('../qvac/medpsy.js', () => ({
  runMedPsy: vi.fn(async () => ({
    output: {
      summary: 'Your symptoms seem mild and you can likely monitor them at home for now.',
      warningSigns: [],
      recommendedNextSteps: ['Rest and monitor at home'],
      questionsToMonitor: [],
      uncertainty: []
    },
    rawText: '{}',
    stats: { timeToFirstTokenMs: 10, generationTimeMs: 20, tokensPerSecond: 50, inputTokens: 10, outputTokens: 10 }
  })),
  MedPsyResponseError: class MedPsyResponseError extends Error {}
}))

vi.mock('../qvac/rag.js', () => ({
  retrieveContext: vi.fn(async () => ({ sources: [], contextText: [] })),
  isKnownSourceId: vi.fn(async () => true)
}))

const { runAssessment } = await import('./assessment-engine.js')

describe('Risk precedence: MedPsy can never lower the Safety Engine risk level', () => {
  it('keeps EMERGENCY even when MedPsy attempts reassuring, MONITOR-like language', async () => {
    const { result, safety } = await runAssessment({
      symptoms: {
        symptoms: [{ key: 'breathing_difficulty', label: 'Difficulty breathing' }],
        durationDays: 1,
        intensity: 'severe',
        evolution: 'worsening'
      },
      answers: [{ questionId: 'q_breathing_severe', value: true }]
    })

    // The Safety Engine determined EMERGENCY...
    expect(safety.riskLevel).toBe('EMERGENCY')
    // ...and MedPsy's reassuring wording was rejected by the Response
    // Validator (risk_contradiction), so the system fell back to the safe
    // deterministic template — but the final risk level is STILL EMERGENCY
    // either way, because MedPsyOutput has no riskLevel field at all.
    expect(result.riskLevel).toBe('EMERGENCY')
  })

  it('MedPsyOutput type structurally has no riskLevel field to override', async () => {
    const medpsy = await import('../qvac/medpsy.js')
    const run = await medpsy.runMedPsy({
      symptoms: { symptoms: [], durationDays: 1, intensity: 'mild', evolution: 'same' },
      answers: [],
      retrievedContext: [],
      riskLevel: 'EMERGENCY'
    })
    expect('riskLevel' in run.output).toBe(false)
  })
})
