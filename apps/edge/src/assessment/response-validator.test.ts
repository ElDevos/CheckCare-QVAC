import { describe, it, expect } from 'vitest'
import { validateMedPsyOutput, type ValidationViolation } from './response-validator.js'
import type { MedPsyOutput } from '../qvac/medpsy.js'

const base: MedPsyOutput = {
  summary: "You're experiencing severe breathing difficulty, which meets emergency criteria. Seek emergency care immediately.",
  warningSigns: ['Shortness of breath is a red flag'],
  recommendedNextSteps: ['Call emergency services or go to the nearest emergency department immediately'],
  questionsToMonitor: [],
  uncertainty: ['Only a healthcare professional can diagnose and treat you']
}

function categories(violations: ValidationViolation[]): string[] {
  return violations.map((v) => v.category)
}

describe('Response Validator', () => {
  it('passes a well-formed, appropriately escalated EMERGENCY response', () => {
    const result = validateMedPsyOutput(base, 'EMERGENCY')
    expect(result.passed).toBe(true)
  })

  it('does NOT false-positive on safe deferential use of the word "diagnose"', () => {
    const result = validateMedPsyOutput(base, 'EMERGENCY')
    expect(categories(result.violations)).not.toContain('diagnosis')
  })

  it('rejects a diagnosis claim ("You have X")', () => {
    const output = { ...base, summary: 'You have pneumonia and should rest at home.' }
    const result = validateMedPsyOutput(output, 'MONITOR')
    expect(result.passed).toBe(false)
    expect(categories(result.violations)).toContain('diagnosis')
  })

  it('rejects a medication prescription claim', () => {
    const output = { ...base, recommendedNextSteps: ['Take 500mg ibuprofen every 6 hours'] }
    const result = validateMedPsyOutput(output, 'MONITOR')
    expect(result.passed).toBe(false)
    expect(categories(result.violations)).toContain('prescription')
  })

  it('rejects unsupported/false certainty ("definitely", "nothing to worry about")', () => {
    const output = { ...base, summary: 'You are definitely fine, nothing to worry about.' }
    const result = validateMedPsyOutput(output, 'MONITOR')
    expect(result.passed).toBe(false)
    expect(categories(result.violations)).toContain('false_certainty')
  })

  it('rejects a risk-contradicting recommendation on an EMERGENCY case', () => {
    const output: MedPsyOutput = {
      summary: 'Your symptoms seem manageable.',
      warningSigns: [],
      recommendedNextSteps: ['Just stay home and rest, no strong need for anything else'],
      questionsToMonitor: [],
      uncertainty: []
    }
    const result = validateMedPsyOutput(output, 'EMERGENCY')
    expect(result.passed).toBe(false)
    expect(categories(result.violations)).toContain('risk_contradiction')
  })

  it('does not require escalation language for a MONITOR case', () => {
    const output: MedPsyOutput = {
      summary: 'No red-flag signs were identified based on what you reported.',
      warningSigns: [],
      recommendedNextSteps: ['Rest, stay hydrated, and watch for new symptoms'],
      questionsToMonitor: ['Seek care if symptoms worsen'],
      uncertainty: []
    }
    const result = validateMedPsyOutput(output, 'MONITOR')
    expect(result.passed).toBe(true)
  })
})
