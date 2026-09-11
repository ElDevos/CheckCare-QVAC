import { describe, it, expect } from 'vitest'
import { evaluateSafety } from './safety-engine.js'

describe('Safety Engine (deterministic, no LLM)', () => {
  it('escalates a red-flag answer to EMERGENCY', () => {
    const result = evaluateSafety({
      symptoms: [{ key: 'breathing_difficulty', label: 'Difficulty breathing' }],
      answers: [{ questionId: 'q_breathing_severe', value: true }],
      durationDays: 1
    })
    expect(result.riskLevel).toBe('EMERGENCY')
    expect(result.triggeredRules.map((r) => r.id)).toContain('rule-breathing-severe')
  })

  it('escalates an urgent-tier answer to URGENT (not EMERGENCY)', () => {
    const result = evaluateSafety({
      symptoms: [{ key: 'cough', label: 'Cough' }],
      answers: [{ questionId: 'q_cough_blood', value: true }],
      durationDays: 3
    })
    expect(result.riskLevel).toBe('URGENT')
  })

  it('returns MONITOR when no rule matches and duration is short', () => {
    const result = evaluateSafety({
      symptoms: [{ key: 'sore_throat', label: 'Sore throat' }],
      answers: [{ questionId: 'q_symptom_worsening', value: false }],
      durationDays: 2
    })
    expect(result.riskLevel).toBe('MONITOR')
    expect(result.triggeredRules).toHaveLength(0)
  })

  it('escalates to PROFESSIONAL_EVALUATION on persistence alone (>=5 days, no red flags)', () => {
    const result = evaluateSafety({
      symptoms: [{ key: 'fatigue', label: 'Fatigue' }],
      answers: [],
      durationDays: 6
    })
    expect(result.riskLevel).toBe('PROFESSIONAL_EVALUATION')
  })

  it('takes the MAXIMUM severity when multiple rules trigger', () => {
    const result = evaluateSafety({
      symptoms: [{ key: 'breathing_difficulty', label: 'Difficulty breathing' }],
      answers: [
        { questionId: 'q_leg_swelling', value: true }, // URGENT
        { questionId: 'q_breathing_severe', value: true } // EMERGENCY
      ],
      durationDays: 1
    })
    expect(result.riskLevel).toBe('EMERGENCY')
    expect(result.triggeredRules.length).toBeGreaterThanOrEqual(2)
  })

  it('flags a free-text mention of possible poisoning regardless of selected symptoms', () => {
    const result = evaluateSafety({
      symptoms: [{ key: 'nausea', label: 'Nausea' }],
      answers: [],
      durationDays: 1,
      freeText: 'I think my child may have swallowed some poison from under the sink'
    })
    expect(result.riskLevel).toBe('EMERGENCY')
  })

  it('never returns a value outside the four allowed risk levels', () => {
    const allowed = new Set(['EMERGENCY', 'URGENT', 'PROFESSIONAL_EVALUATION', 'MONITOR'])
    const result = evaluateSafety({ symptoms: [], answers: [], durationDays: 0 })
    expect(allowed.has(result.riskLevel)).toBe(true)
  })

  it('is a pure function: same input always produces the same output', () => {
    const input = {
      symptoms: [{ key: 'headache', label: 'Headache' }],
      answers: [{ questionId: 'q_thunderclap_headache', value: true }],
      durationDays: 1
    }
    const a = evaluateSafety(input)
    const b = evaluateSafety(input)
    expect(a).toEqual(b)
  })
})
