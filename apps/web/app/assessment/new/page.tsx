'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SYMPTOMS } from '@checkcare/safety-rules'
import type { AdaptiveQuestion, QuestionAnswer, SymptomEntry, SymptomInput } from '@checkcare/shared-types'
import { api, ApiError } from '@/lib/api'

type Step = 'symptoms' | 'questions' | 'submitting'

export default function NewAssessmentPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('symptoms')
  const [error, setError] = useState<string | null>(null)

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [customSymptom, setCustomSymptom] = useState('')
  const [durationDays, setDurationDays] = useState(1)
  const [intensity, setIntensity] = useState<SymptomInput['intensity']>('mild')
  const [evolution, setEvolution] = useState<SymptomInput['evolution']>('same')
  const [freeText, setFreeText] = useState('')

  const [questions, setQuestions] = useState<AdaptiveQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, boolean>>({})

  function toggleSymptom(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function buildSymptomEntries(): SymptomEntry[] {
    const entries: SymptomEntry[] = SYMPTOMS.filter((s) => selectedKeys.has(s.key) && s.key !== 'other').map((s) => ({
      key: s.key,
      label: s.label
    }))
    if (selectedKeys.has('other') && customSymptom.trim()) {
      entries.push({ key: 'other', label: customSymptom.trim(), custom: true })
    }
    return entries
  }

  async function handleSymptomsContinue() {
    setError(null)
    const symptoms = buildSymptomEntries()
    if (symptoms.length === 0) {
      setError('Selecciona al menos un síntoma para continuar.')
      return
    }
    try {
      const { questions } = await api.startAssessment({ symptoms, durationDays, intensity, evolution, freeText: freeText || undefined })
      setQuestions(questions)
      setStep('questions')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar las preguntas.')
    }
  }

  async function handleQuestionsSubmit() {
    setError(null)
    setStep('submitting')
    const symptoms: SymptomInput = { symptoms: buildSymptomEntries(), durationDays, intensity, evolution, freeText: freeText || undefined }
    const answerList: QuestionAnswer[] = questions.map((q) => ({ questionId: q.id, value: answers[q.id] ?? false }))
    try {
      const { assessment } = await api.evaluate(symptoms, answerList)
      router.push(`/assessment/${assessment.id}`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo generar la evaluación.')
      setStep('questions')
    }
  }

  return (
    <main className="container" style={{ paddingTop: 32 }}>
      <div className="progress-dots">
        <span data-active="true" />
        <span data-active={step !== 'symptoms'} />
        <span data-active={step === 'submitting'} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {step === 'symptoms' && (
        <SymptomsStep
          selectedKeys={selectedKeys}
          toggleSymptom={toggleSymptom}
          customSymptom={customSymptom}
          setCustomSymptom={setCustomSymptom}
          durationDays={durationDays}
          setDurationDays={setDurationDays}
          intensity={intensity}
          setIntensity={setIntensity}
          evolution={evolution}
          setEvolution={setEvolution}
          freeText={freeText}
          setFreeText={setFreeText}
          onContinue={handleSymptomsContinue}
        />
      )}

      {step === 'questions' && (
        <QuestionsStep questions={questions} answers={answers} setAnswers={setAnswers} onSubmit={handleQuestionsSubmit} onBack={() => setStep('symptoms')} />
      )}

      {step === 'submitting' && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <h3>La IA local está generando tu evaluación…</h3>
          <p>MedPsy se está ejecutando en tu dispositivo. No se envía ningún dato a internet.</p>
        </div>
      )}
    </main>
  )
}

function SymptomsStep(props: {
  selectedKeys: Set<string>
  toggleSymptom: (key: string) => void
  customSymptom: string
  setCustomSymptom: (v: string) => void
  durationDays: number
  setDurationDays: (v: number) => void
  intensity: SymptomInput['intensity']
  setIntensity: (v: SymptomInput['intensity']) => void
  evolution: SymptomInput['evolution']
  setEvolution: (v: SymptomInput['evolution']) => void
  freeText: string
  setFreeText: (v: string) => void
  onContinue: () => void
}) {
  return (
    <>
      <h1>¿Qué síntomas tienes?</h1>
      <p>Selecciona todos los que apliquen. Puedes agregar otros síntomas al final.</p>

      <div className="chip-grid">
        {SYMPTOMS.map((s) => (
          <button
            key={s.key}
            type="button"
            className="chip"
            data-selected={props.selectedKeys.has(s.key)}
            onClick={() => props.toggleSymptom(s.key)}
          >
            {s.labelEs}
          </button>
        ))}
      </div>

      {props.selectedKeys.has('other') && (
        <div className="field">
          <label htmlFor="custom-symptom">Describe el otro síntoma</label>
          <input
            id="custom-symptom"
            type="text"
            value={props.customSymptom}
            onChange={(e) => props.setCustomSymptom(e.target.value)}
            placeholder="Ej. dolor en el pecho al respirar"
          />
        </div>
      )}

      <div className="field">
        <label htmlFor="duration">Duración (días)</label>
        <input
          id="duration"
          type="number"
          min={0}
          max={365}
          value={props.durationDays}
          onChange={(e) => props.setDurationDays(Number(e.target.value))}
        />
      </div>

      <div className="field">
        <label>Intensidad</label>
        <div className="segmented">
          {(['mild', 'moderate', 'severe'] as const).map((v) => (
            <button key={v} type="button" data-selected={props.intensity === v} onClick={() => props.setIntensity(v)}>
              {{ mild: 'Leve', moderate: 'Moderada', severe: 'Severa' }[v]}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Evolución</label>
        <div className="segmented">
          {(['improving', 'same', 'worsening'] as const).map((v) => (
            <button key={v} type="button" data-selected={props.evolution === v} onClick={() => props.setEvolution(v)}>
              {{ improving: 'Mejorando', same: 'Igual', worsening: 'Empeorando' }[v]}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="free-text">Detalles adicionales (opcional)</label>
        <textarea
          id="free-text"
          rows={3}
          value={props.freeText}
          onChange={(e) => props.setFreeText(e.target.value)}
          placeholder="Cualquier información adicional que consideres relevante"
        />
      </div>

      <button className="btn btn-primary btn-block" onClick={props.onContinue}>
        Continuar
      </button>
    </>
  )
}

function QuestionsStep(props: {
  questions: AdaptiveQuestion[]
  answers: Record<string, boolean>
  setAnswers: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void
  onSubmit: () => void
  onBack: () => void
}) {
  return (
    <>
      <h1>Algunas preguntas más</h1>
      <p>Estas preguntas nos ayudan a identificar señales de alerta relevantes para tus síntomas.</p>

      {props.questions.map((q) => (
        <div key={q.id} className="card">
          <h3>{q.textEs}</h3>
          <div className="segmented">
            <button type="button" data-selected={props.answers[q.id] === true} onClick={() => props.setAnswers((p) => ({ ...p, [q.id]: true }))}>
              Sí
            </button>
            <button type="button" data-selected={props.answers[q.id] === false} onClick={() => props.setAnswers((p) => ({ ...p, [q.id]: false }))}>
              No
            </button>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-ghost" onClick={props.onBack}>
          Atrás
        </button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={props.onSubmit}>
          Ver evaluación
        </button>
      </div>
    </>
  )
}
