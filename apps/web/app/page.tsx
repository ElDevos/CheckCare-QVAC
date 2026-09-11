import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="container" style={{ paddingTop: 32 }}>
      <h1>Orientación temprana sobre tus síntomas, sin salir de tu dispositivo</h1>
      <p>
        CheckCare te ayuda a registrar síntomas, responder preguntas relevantes y entender cuándo
        deberías considerar buscar atención profesional. Todo el procesamiento de IA ocurre en tu
        propia computadora.
      </p>

      <div className="card">
        <h2>🔒 Privacidad primero</h2>
        <p>
          Tus síntomas, tus respuestas y las evaluaciones nunca se envían a un servidor externo.
          Se almacenan localmente en este dispositivo, en una base de datos SQLite.
        </p>
      </div>

      <div className="card">
        <h2>🧠 IA médica local: MedPsy</h2>
        <p>
          CheckCare ejecuta <strong>MedPsy-1.7B</strong> (cuantizado Q4_K_M), un modelo
          especializado en salud, directamente en tu hardware mediante <strong>QVAC</strong> y
          llama.cpp. No se usa ninguna IA médica en la nube para el flujo principal.
        </p>
      </div>

      <div className="card">
        <h2>📡 Funciona sin conexión</h2>
        <p>
          Una vez instalado el modelo, CheckCare puede realizar evaluaciones completas con el
          Wi-Fi apagado. Puedes comprobarlo tú mismo en cualquier momento.
        </p>
      </div>

      <div className="card" style={{ borderColor: 'var(--risk-urgent-border)' }}>
        <h2>⚠️ Qué NO es CheckCare</h2>
        <p>
          CheckCare es una herramienta educativa y de orientación. No proporciona diagnósticos
          médicos ni prescribe tratamientos, y no sustituye la evaluación de un profesional de la
          salud.
        </p>
      </div>

      <Link href="/disclaimer" className="btn btn-primary btn-block">
        Comenzar evaluación
      </Link>

      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        <Link href="/dashboard" className="btn btn-ghost">
          Ir al panel
        </Link>
        <Link href="/model" className="btn btn-ghost">
          Información del modelo
        </Link>
      </div>

      <p className="footer-note">
        CheckCare no es una herramienta de diagnóstico médico. Ante una emergencia, contacta a los
        servicios de emergencia de tu localidad de inmediato.
      </p>
    </main>
  )
}
