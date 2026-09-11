'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AssessmentRecord } from '@checkcare/shared-types'
import { api, ApiError } from '@/lib/api'
import { RiskBadge, RiskPanel, riskLevelLabel } from '@/components/RiskBadge'

export default function AssessmentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [assessment, setAssessment] = useState<AssessmentRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [followUpStatus, setFollowUpStatus] = useState<'better' | 'same' | 'worse' | null>(null)
  const [followUpNotes, setFollowUpNotes] = useState('')
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false)

  useEffect(() => {
    api
      .getAssessment(params.id)
      .then((r) => setAssessment(r.assessment))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'No se pudo cargar la evaluación.'))
  }, [params.id])

  async function submitFollowUp() {
    if (!followUpStatus || !assessment) return
    setSubmittingFollowUp(true)
    try {
      const { assessment: newAssessment } = await api.followUp({
        assessmentId: assessment.id,
        status: followUpStatus,
        notes: followUpNotes || undefined
      })
      router.push(`/assessment/${newAssessment.id}`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo registrar el seguimiento.')
      setSubmittingFollowUp(false)
    }
  }

  if (error) {
    return (
      <main className="container" style={{ paddingTop: 32 }}>
        <div className="alert alert-error">{error}</div>
      </main>
    )
  }

  if (!assessment) {
    return (
      <main className="container" style={{ paddingTop: 32 }}>
        <p>Cargando evaluación…</p>
      </main>
    )
  }

  const { result } = assessment

  return (
    <main className="container" style={{ paddingTop: 32 }}>
      <RiskPanel level={result.riskLevel}>
        <h2>{riskLevelLabel(result.riskLevel)}</h2>
        <p style={{ color: 'inherit', opacity: 0.9 }}>{result.summary}</p>
      </RiskPanel>

      {result.warningSigns.length > 0 && (
        <div className="card">
          <h3>Señales de alerta identificadas</h3>
          <ul className="list-clean">
            {result.warningSigns.map((w, i) => (
              <li key={i}>⚠️ {w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h3>Próximos pasos recomendados</h3>
        <ul className="list-clean">
          {result.recommendedNextSteps.map((s, i) => (
            <li key={i}>➡️ {s}</li>
          ))}
        </ul>
      </div>

      {result.questionsToMonitor.length > 0 && (
        <div className="card">
          <h3>Qué vigilar</h3>
          <ul className="list-clean">
            {result.questionsToMonitor.map((q, i) => (
              <li key={i}>👁️ {q}</li>
            ))}
          </ul>
        </div>
      )}

      {result.uncertainty.length > 0 && (
        <div className="card">
          <h3>Incertidumbre</h3>
          <ul className="list-clean">
            {result.uncertainty.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h3>Fuentes</h3>
        {result.sources.length === 0 ? (
          <p>No se recuperaron fuentes específicas para este caso.</p>
        ) : (
          <ul className="list-clean">
            {result.sources.map((s) => (
              <li key={s.id}>
                <div>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.title}
                  </a>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.source}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card" style={{ background: 'var(--color-primary-light)', border: 'none' }}>
        <p style={{ color: 'var(--color-primary-dark)', margin: 0, fontSize: 13 }}>{result.disclaimer}</p>
      </div>

      <div className="card">
        <h3>Seguimiento</h3>
        <p>¿Cómo te sientes ahora en comparación con esta evaluación?</p>
        <div className="segmented" style={{ marginBottom: 16 }}>
          <button type="button" data-selected={followUpStatus === 'better'} onClick={() => setFollowUpStatus('better')}>
            Mejor
          </button>
          <button type="button" data-selected={followUpStatus === 'same'} onClick={() => setFollowUpStatus('same')}>
            Igual
          </button>
          <button type="button" data-selected={followUpStatus === 'worse'} onClick={() => setFollowUpStatus('worse')}>
            Peor
          </button>
        </div>
        <div className="field">
          <label htmlFor="follow-up-notes">Notas (opcional)</label>
          <textarea id="follow-up-notes" rows={2} value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-block" disabled={!followUpStatus || submittingFollowUp} onClick={submitFollowUp}>
          {submittingFollowUp ? 'Generando nueva evaluación…' : 'Registrar seguimiento'}
        </button>
        <p style={{ fontSize: 12, marginTop: 8 }}>
          El seguimiento crea una evaluación nueva; esta evaluación original no se modifica.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
        <span>Modelo: {assessment.modelVersion}</span>
        <span>·</span>
        <span>Reglas de seguridad v{assessment.safetyRuleVersion}</span>
      </div>
    </main>
  )
}
