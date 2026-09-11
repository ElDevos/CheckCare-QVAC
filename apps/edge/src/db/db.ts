import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import type { AssessmentRecord, FollowUpInput, QuestionAnswer, SymptomEntry } from '@checkcare/shared-types'
import { logger } from '../logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const DATA_DIR = path.join(REPO_ROOT, 'data')
const DB_PATH = path.join(DATA_DIR, 'checkcare.db')

fs.mkdirSync(DATA_DIR, { recursive: true })

/**
 * Local-only SQLite storage (master prompt section 25). Everything here
 * stays on disk on this device; nothing in this module makes a network
 * call. See docs/privacy.md.
 */
export const db: Database.Database = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS assessments (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    symptoms_json TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    intensity TEXT NOT NULL,
    evolution TEXT NOT NULL,
    answers_json TEXT NOT NULL,
    risk_level TEXT NOT NULL,
    result_json TEXT NOT NULL,
    model_version TEXT NOT NULL,
    safety_rule_version TEXT NOT NULL,
    parent_assessment_id TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at);
`)

interface AssessmentRow {
  id: string
  created_at: string
  symptoms_json: string
  duration_days: number
  intensity: string
  evolution: string
  answers_json: string
  risk_level: string
  result_json: string
  model_version: string
  safety_rule_version: string
  parent_assessment_id: string | null
}

function rowToRecord(row: AssessmentRow): AssessmentRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    symptoms: JSON.parse(row.symptoms_json),
    durationDays: row.duration_days,
    intensity: row.intensity,
    evolution: row.evolution,
    answers: JSON.parse(row.answers_json),
    riskLevel: row.risk_level as AssessmentRecord['riskLevel'],
    result: JSON.parse(row.result_json),
    modelVersion: row.model_version,
    safetyRuleVersion: row.safety_rule_version,
    parentAssessmentId: row.parent_assessment_id
  }
}

export function insertAssessment(record: Omit<AssessmentRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): AssessmentRecord {
  const id = record.id ?? randomUUID()
  const createdAt = record.createdAt ?? new Date().toISOString()

  db.prepare(
    `INSERT INTO assessments
      (id, created_at, symptoms_json, duration_days, intensity, evolution, answers_json, risk_level, result_json, model_version, safety_rule_version, parent_assessment_id)
     VALUES (@id, @createdAt, @symptomsJson, @durationDays, @intensity, @evolution, @answersJson, @riskLevel, @resultJson, @modelVersion, @safetyRuleVersion, @parentAssessmentId)`
  ).run({
    id,
    createdAt,
    symptomsJson: JSON.stringify(record.symptoms),
    durationDays: record.durationDays,
    intensity: record.intensity,
    evolution: record.evolution,
    answersJson: JSON.stringify(record.answers),
    riskLevel: record.riskLevel,
    resultJson: JSON.stringify(record.result),
    modelVersion: record.modelVersion,
    safetyRuleVersion: record.safetyRuleVersion,
    parentAssessmentId: record.parentAssessmentId ?? null
  })

  logger.info('assessment_saved', { id, riskLevel: record.riskLevel })
  return { ...record, id, createdAt }
}

export function getAssessmentById(id: string): AssessmentRecord | null {
  const row = db.prepare('SELECT * FROM assessments WHERE id = ?').get(id) as AssessmentRow | undefined
  return row ? rowToRecord(row) : null
}

export function listAssessments(limit = 50): AssessmentRecord[] {
  const rows = db.prepare('SELECT * FROM assessments ORDER BY created_at DESC LIMIT ?').all(limit) as AssessmentRow[]
  return rows.map(rowToRecord)
}

/**
 * Follow-up (master prompt section 27): always creates a NEW assessment
 * record linked via parent_assessment_id. The original is never mutated.
 */
export function recordFollowUp(input: FollowUpInput, newAssessment: Omit<AssessmentRecord, 'id' | 'createdAt' | 'parentAssessmentId'>): AssessmentRecord {
  const parent = getAssessmentById(input.assessmentId)
  if (!parent) throw new Error(`Assessment ${input.assessmentId} not found`)

  return insertAssessment({
    ...newAssessment,
    parentAssessmentId: input.assessmentId
  })
}

export function getFollowUpChain(assessmentId: string): AssessmentRecord[] {
  const chain: AssessmentRecord[] = []
  let current: AssessmentRecord | null = getAssessmentById(assessmentId)
  while (current) {
    chain.unshift(current)
    const parentId: string | null | undefined = current.parentAssessmentId
    current = parentId ? getAssessmentById(parentId) : null
  }
  return chain
}
