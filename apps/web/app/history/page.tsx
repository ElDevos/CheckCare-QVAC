'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { AssessmentRecord } from '@checkcare/shared-types'
import { api } from '@/lib/api'
import { RiskBadge } from '@/components/RiskBadge'

export default function HistoryPage() {
  const [items, setItems] = useState<AssessmentRecord[] | null>(null)

  useEffect(() => {
    api.history(200).then((r) => setItems(r.items))
  }, [])

  const grouped = groupByDate(items ?? [])

  return (
    <main className="container" style={{ paddingTop: 32 }}>
      <h1>Historial</h1>
      <p>Todas tus evaluaciones se almacenan localmente en este dispositivo.</p>

      {!items && <p>Cargando…</p>}
      {items && items.length === 0 && (
        <div className="card">
          <p>Aún no tienes evaluaciones registradas.</p>
          <Link href="/disclaimer" className="btn btn-primary">
            Comenzar evaluación
          </Link>
        </div>
      )}

      {Object.entries(grouped).map(([date, records]) => (
        <div key={date} className="card">
          <h3>{date}</h3>
          <ul className="list-clean">
            {records.map((a) => (
              <li key={a.id}>
                <Link href={`/assessment/${a.id}`} style={{ flex: 1, textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.symptoms.map((s) => s.label).join(' + ') || 'Sin síntomas'}</div>
                      {a.parentAssessmentId && <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Seguimiento</div>}
                    </div>
                    <RiskBadge level={a.riskLevel} size="sm" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </main>
  )
}

function groupByDate(items: AssessmentRecord[]): Record<string, AssessmentRecord[]> {
  const groups: Record<string, AssessmentRecord[]> = {}
  for (const item of items) {
    const key = new Date(item.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  }
  return groups
}
