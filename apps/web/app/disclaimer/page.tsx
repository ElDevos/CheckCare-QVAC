'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DisclaimerPage() {
  const [accepted, setAccepted] = useState(false)
  const router = useRouter()

  function handleContinue() {
    try {
      localStorage.setItem('checkcare_disclaimer_accepted', 'true')
    } catch {
      // localStorage may be unavailable; proceed anyway, this is not a hard gate.
    }
    router.push('/assessment/new')
  }

  return (
    <main className="container" style={{ paddingTop: 32 }}>
      <h1>Aviso médico</h1>

      <div className="card" style={{ borderColor: 'var(--risk-urgent-border)' }}>
        <p style={{ color: 'var(--color-text)', fontWeight: 500 }}>
          CheckCare es una herramienta educativa y de orientación. No proporciona diagnósticos
          médicos y no sustituye la evaluación de un profesional de la salud.
        </p>
        <p>
          La información generada se basa en los síntomas que tú mismo reportas y en fuentes
          médicas de referencia, pero puede ser incompleta o no aplicar a tu situación particular.
        </p>
        <p style={{ color: 'var(--risk-emergency-text)', fontWeight: 600 }}>
          Si estás experimentando una emergencia médica, llama de inmediato a los servicios de
          emergencia de tu localidad o dirígete al servicio de urgencias más cercano. No esperes
          a completar esta evaluación.
        </p>
      </div>

      <div className="card">
        <h3>Antes de continuar</h3>
        <ul style={{ color: 'var(--color-text-muted)', paddingLeft: 20 }}>
          <li>Tus datos se procesan y almacenan únicamente en este dispositivo.</li>
          <li>CheckCare nunca indicará un diagnóstico ni te dirá "no tienes nada".</li>
          <li>Siempre se te mostrarán las fuentes usadas para cada recomendación.</li>
        </ul>
      </div>

      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: 16,
          border: '1.5px solid var(--color-border)',
          borderRadius: 12,
          marginBottom: 20,
          cursor: 'pointer',
          background: 'var(--color-surface)'
        }}
      >
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          style={{ width: 20, height: 20, marginTop: 2 }}
        />
        <span>
          He leído y comprendo que CheckCare no reemplaza la atención médica profesional, y que
          debo buscar ayuda de emergencia apropiada si la situación lo requiere.
        </span>
      </label>

      <button className="btn btn-primary btn-block" disabled={!accepted} onClick={handleContinue}>
        Aceptar y continuar
      </button>
    </main>
  )
}
