import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import type { AssessmentRecord, FollowUpInput, QuestionAnswer, SymptomInput } from '@checkcare/shared-types'
import { selectQuestions } from '../assessment/question-engine.js'
import { runAssessment } from '../assessment/assessment-engine.js'
import { RULES_VERSION } from '../safety/rules.js'
import { modelManager, ModelNotInstalledError, ModelLoadError } from '../qvac/model-manager.js'
import { insertAssessment, getAssessmentById, listAssessments, recordFollowUp } from '../db/db.js'
import { MedPsyResponseError } from '../qvac/medpsy.js'
import { logger } from '../logger.js'

export const router = Router()

const symptomEntrySchema = z.object({ key: z.string(), label: z.string(), custom: z.boolean().optional() })

const symptomInputSchema = z.object({
  symptoms: z.array(symptomEntrySchema).min(1, 'Select at least one symptom.'),
  durationDays: z.number().int().min(0).max(365),
  intensity: z.enum(['mild', 'moderate', 'severe']),
  evolution: z.enum(['improving', 'same', 'worsening']),
  freeText: z.string().max(2000).optional()
})

const answerSchema = z.object({ questionId: z.string(), value: z.union([z.string(), z.boolean()]) })

const evaluateSchema = z.object({
  symptoms: symptomInputSchema,
  answers: z.array(answerSchema)
})

const followUpSchema = z.object({
  assessmentId: z.string(),
  status: z.enum(['better', 'same', 'worse']),
  newSymptoms: z.array(symptomEntrySchema).optional(),
  notes: z.string().max(2000).optional()
})

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next)
}

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', offline: true, remoteAI: 'none', timestamp: new Date().toISOString() })
})

router.get(
  '/model/status',
  asyncHandler(async (_req, res) => {
    const info = await modelManager.getInfo()
    res.json(info)
  })
)

router.post(
  '/assessment/start',
  asyncHandler(async (req, res) => {
    const parsed = symptomInputSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_input', message: 'Revisa los síntomas ingresados.', details: parsed.error.flatten() })
      return
    }
    const questions = selectQuestions(parsed.data.symptoms)
    res.json({ questions })
  })
)

router.post(
  '/assessment/questions',
  asyncHandler(async (req, res) => {
    const parsed = z.object({ symptoms: z.array(symptomEntrySchema) }).safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_input', message: 'Revisa los síntomas ingresados.' })
      return
    }
    const questions = selectQuestions(parsed.data.symptoms)
    res.json({ questions })
  })
)

router.post(
  '/assessment/evaluate',
  asyncHandler(async (req, res) => {
    const parsed = evaluateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_input', message: 'Revisa la información enviada.', details: parsed.error.flatten() })
      return
    }
    const { symptoms, answers } = parsed.data as { symptoms: SymptomInput; answers: QuestionAnswer[] }

    const { result, modelUsed } = await runAssessment({ symptoms, answers })

    const record = insertAssessment({
      symptoms: symptoms.symptoms,
      durationDays: symptoms.durationDays,
      intensity: symptoms.intensity,
      evolution: symptoms.evolution,
      answers,
      riskLevel: result.riskLevel,
      result,
      modelVersion: modelUsed ? 'MedPsy-1.7B-Q4_K_M' : 'fallback-template',
      safetyRuleVersion: RULES_VERSION
    })

    res.json({ assessment: record, modelUsed })
  })
)

router.get(
  '/assessment/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id
    if (!id) {
      res.status(400).json({ error: 'invalid_input', message: 'Falta el identificador de la evaluación.' })
      return
    }
    const record = getAssessmentById(id)
    if (!record) {
      res.status(404).json({ error: 'not_found', message: 'Evaluación no encontrada.' })
      return
    }
    res.json({ assessment: record })
  })
)

router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const items = listAssessments(limit)
    res.json({ items })
  })
)

router.post(
  '/follow-up',
  asyncHandler(async (req, res) => {
    const parsed = followUpSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_input', message: 'Revisa la información de seguimiento.' })
      return
    }
    const input = parsed.data as FollowUpInput

    const parent = getAssessmentById(input.assessmentId)
    if (!parent) {
      res.status(404).json({ error: 'not_found', message: 'Evaluación original no encontrada.' })
      return
    }

    // A follow-up re-runs the full pipeline with the union of prior +
    // newly reported symptoms, plus a note on trajectory. It NEVER
    // mutates the parent record (master prompt section 27).
    const mergedSymptoms = [...parent.symptoms, ...(input.newSymptoms ?? [])].filter(
      (s, i, arr) => arr.findIndex((x) => x.key === s.key) === i
    )
    const symptoms: SymptomInput = {
      symptoms: mergedSymptoms,
      durationDays: parent.durationDays,
      intensity: parent.intensity as SymptomInput['intensity'],
      evolution: input.status === 'worse' ? 'worsening' : input.status === 'better' ? 'improving' : 'same',
      freeText: input.notes
    }
    const answers = parent.answers

    const { result, modelUsed } = await runAssessment({ symptoms, answers })

    const record = recordFollowUp(input, {
      symptoms: symptoms.symptoms,
      durationDays: symptoms.durationDays,
      intensity: symptoms.intensity,
      evolution: symptoms.evolution,
      answers,
      riskLevel: result.riskLevel,
      result,
      modelVersion: modelUsed ? 'MedPsy-1.7B-Q4_K_M' : 'fallback-template',
      safetyRuleVersion: RULES_VERSION
    })

    res.json({ assessment: record, modelUsed })
  })
)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : String(err)
  logger.error('api_error', { message })

  if (err instanceof ModelNotInstalledError) {
    res.status(503).json({ error: 'model_not_installed', message: 'El modelo local MedPsy no está instalado. Ejecuta scripts/setup-model.sh.' })
    return
  }
  if (err instanceof ModelLoadError) {
    res.status(503).json({ error: 'model_load_failed', message: 'No se pudo cargar el modelo local. Revisa la memoria disponible e inténtalo de nuevo.' })
    return
  }
  if (err instanceof MedPsyResponseError) {
    res.status(502).json({ error: 'model_response_invalid', message: 'La IA local no pudo generar una respuesta válida. Se aplicó una respuesta de respaldo.' })
    return
  }
  res.status(500).json({ error: 'internal_error', message: 'Ocurrió un error inesperado. Inténtalo de nuevo.' })
})
