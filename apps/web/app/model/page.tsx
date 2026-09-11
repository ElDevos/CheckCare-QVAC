'use client'

import { useEffect, useState } from 'react'
import type { ModelInfo } from '@checkcare/shared-types'
import { api } from '@/lib/api'

export default function ModelPage() {
  const [model, setModel] = useState<ModelInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.modelStatus().then(setModel).catch((e) => setError(e.message))
  }, [])

  return (
    <main className="container" style={{ paddingTop: 32 }}>
      <h1>Información del modelo</h1>
      <p>CheckCare ejecuta este modelo directamente en tu dispositivo, sin llamadas a IA en la nube.</p>

      {error && <div className="alert alert-error">{error}</div>}

      {model && (
        <div className="card">
          <table className="kv-table">
            <tbody>
              <tr>
                <td>Modelo</td>
                <td>{model.name}</td>
              </tr>
              <tr>
                <td>Cuantización</td>
                <td>{model.quantization}</td>
              </tr>
              <tr>
                <td>Runtime</td>
                <td>{model.runtime}</td>
              </tr>
              <tr>
                <td>Backend</td>
                <td>{model.backend}</td>
              </tr>
              <tr>
                <td>Ejecución</td>
                <td>Local</td>
              </tr>
              <tr>
                <td>IA remota</td>
                <td>Ninguna</td>
              </tr>
              <tr>
                <td>Tamaño aproximado</td>
                <td>{(model.approxSizeBytes / 1e9).toFixed(2)} GB</td>
              </tr>
              <tr>
                <td>Contexto</td>
                <td>{model.contextLength.toLocaleString('es')} tokens</td>
              </tr>
              <tr>
                <td>Estado</td>
                <td>{model.status}</td>
              </tr>
              <tr>
                <td>Instalado</td>
                <td>{model.installedAt ? new Date(model.installedAt).toLocaleString('es') : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h3>Base de conocimiento (RAG)</h3>
        <p>
          Las respuestas se complementan con fragmentos recuperados de una base de conocimiento
          local construida a partir de fuentes médicas confiables (NHS del Reino Unido). Consulta{' '}
          <code>knowledge/manifest.json</code> en el repositorio para ver la lista completa.
        </p>
      </div>

      <a href="/benchmark" className="btn btn-ghost">
        Ver benchmark de rendimiento
      </a>
    </main>
  )
}
