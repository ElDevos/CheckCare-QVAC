'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { AssessmentRecord, ModelInfo } from '@checkcare/shared-types'
import { api } from '@/lib/api'
import { RiskBadge } from '@/components/RiskBadge'

export default function DashboardPage() {
  const [history, setHistory] = useState<AssessmentRecord[] | null>(null)
  const [model, setModel] = useState<ModelInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .history(5)
      .then((r) => setHistory(r.items))
      .catch((e) => setError(e.message))
    api.modelStatus().then(setModel).catch(() => undefined)
  }, [])

  return (
    <main className="container" style={{ paddingTop: 32 }}>
      <h1>Panel</h1>

      <Link href="/disclaimer" className="btn btn-primary btn-block" style={{ marginBottom: 20 }}>
        + Nueva evaluación
      </Link>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>IA local</h3>
        {model ? (
          <table className="kv-table">
            <tbody>
              <tr>
                <td>Modelo</td>
                <td>{model.name}</td>
              </tr>
              <tr>
                <td>Estado</td>
                <td>{modelStatusEs(model.status)}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p>Consultando estado del modelo…</p>
        )}
        <Link href="/model" className="btn btn-ghost" style={{ marginTop: 8 }}>
          Ver detalles del modelo
        </Link>
      </div>

      <div className="card">
        <h3>Privacidad</h3>
        <p>Ningún dato médico sale de este dispositivo. Todo se procesa y guarda localmente.</p>
        <Link href="/privacy" className="btn btn-ghost">
          Leer política de privacidad
        </Link>
      </div>

      <div className="card">
        <h3>Evaluaciones recientes</h3>
        {!history && <p>Cargando…</p>}
        {history && history.length === 0 && <p>Aún no has completado ninguna evaluación.</p>}
        {history && history.length > 0 && (
          <ul className="list-clean">
            {history.map((a) => (
              <li key={a.id}>
                <Link href={`/assessment/${a.id}`} style={{ flex: 1, textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.symptoms.map((s) => s.label).join(', ') || 'Sin síntomas'}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{formatDate(a.createdAt)}</div>
                    </div>
                    <RiskBadge level={a.riskLevel} size="sm" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/history" className="btn btn-ghost" style={{ marginTop: 12 }}>
          Ver historial completo
        </Link>
      </div>
    </main>
  )
}

function modelStatusEs(status: ModelInfo['status']): string {
  const map: Record<ModelInfo['status'], string> = {
    NOT_INSTALLED: 'No instalado',
    LOADING: 'Cargando modelo local…',
    READY: 'IA local lista',
    BUSY: 'Procesando…',
    ERROR: 'Error al cargar el modelo',
    UNLOADING: 'Liberando recursos…'
  }
  return map[status]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })
}
