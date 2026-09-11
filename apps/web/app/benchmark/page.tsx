import fs from 'node:fs/promises'
import path from 'node:path'

interface BenchmarkRecord {
  timestamp: string
  device: string
  os: string
  architecture: string
  model: string
  quantization: string
  modelLoadTimeMs: number
  inputTokens: number
  outputTokens: number
  timeToFirstTokenMs: number
  generationTimeMs: number
  tokensPerSecond: number
  backendDevice: string
}

const REPORTS_DIR = path.resolve(process.cwd(), '..', '..', 'evaluation', 'reports')

async function loadLatestBenchmark(): Promise<BenchmarkRecord[] | null> {
  try {
    const files = (await fs.readdir(REPORTS_DIR)).filter((f) => f.startsWith('benchmark-')).sort()
    if (files.length === 0) return null
    const latest = files[files.length - 1]
    const raw = await fs.readFile(path.join(REPORTS_DIR, latest), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const dynamic = 'force-dynamic'

export default async function BenchmarkPage() {
  const records = await loadLatestBenchmark()

  return (
    <main className="container" style={{ paddingTop: 32 }}>
      <h1>Benchmark de rendimiento</h1>
      <p>
        Estos valores se miden ejecutando inferencia real con MedPsy a través de QVAC en este
        dispositivo — no son valores simulados. Ejecuta <code>npm run benchmark</code> para
        generar una nueva medición.
      </p>

      {!records && (
        <div className="card">
          <p>Aún no hay un reporte de benchmark. Ejecuta:</p>
          <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 8, overflowX: 'auto' }}>
            npm run benchmark
          </pre>
        </div>
      )}

      {records && records.length > 0 && (
        <>
          <div className="card">
            <h3>Dispositivo</h3>
            <table className="kv-table">
              <tbody>
                <tr>
                  <td>Dispositivo</td>
                  <td>{records[0].device}</td>
                </tr>
                <tr>
                  <td>Sistema operativo</td>
                  <td>{records[0].os}</td>
                </tr>
                <tr>
                  <td>Arquitectura</td>
                  <td>{records[0].architecture}</td>
                </tr>
                <tr>
                  <td>Modelo</td>
                  <td>
                    {records[0].model} ({records[0].quantization})
                  </td>
                </tr>
                <tr>
                  <td>Backend de inferencia</td>
                  <td>{records[0].backendDevice}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {records.map((r, i) => (
            <div className="card" key={i}>
              <h3>Ejecución {i + 1}</h3>
              <table className="kv-table">
                <tbody>
                  {r.modelLoadTimeMs > 0 && (
                    <tr>
                      <td>Tiempo de carga del modelo</td>
                      <td>{r.modelLoadTimeMs} ms</td>
                    </tr>
                  )}
                  <tr>
                    <td>Tokens de entrada</td>
                    <td>{r.inputTokens}</td>
                  </tr>
                  <tr>
                    <td>Tokens generados</td>
                    <td>{r.outputTokens}</td>
                  </tr>
                  <tr>
                    <td>Tiempo al primer token (TTFT)</td>
                    <td>{r.timeToFirstTokenMs} ms</td>
                  </tr>
                  <tr>
                    <td>Tiempo de generación</td>
                    <td>{r.generationTimeMs} ms</td>
                  </tr>
                  <tr>
                    <td>Tokens por segundo</td>
                    <td>{r.tokensPerSecond.toFixed(1)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}
    </main>
  )
}
