export default function PrivacyPage() {
  return (
    <main className="container" style={{ paddingTop: 32 }}>
      <h1>Privacidad</h1>

      <div className="card">
        <h3>Lo que nunca sale de tu dispositivo</h3>
        <ul style={{ color: 'var(--color-text-muted)', paddingLeft: 20 }}>
          <li>Los síntomas e información de salud que reportas</li>
          <li>Los prompts enviados al modelo local</li>
          <li>Las respuestas generadas por MedPsy</li>
          <li>Tus evaluaciones y tu historial</li>
        </ul>
      </div>

      <div className="card">
        <h3>Cómo funciona</h3>
        <p>
          La aplicación web se comunica únicamente con el Edge Runtime de CheckCare en{' '}
          <code>http://127.0.0.1</code> (tu propia máquina). El Edge Runtime ejecuta MedPsy a
          través de QVAC directamente en tu hardware y guarda los resultados en una base de datos
          SQLite local. Ninguno de estos componentes envía información médica a un servidor
          externo.
        </p>
      </div>

      <div className="card">
        <h3>Modo offline</h3>
        <p>
          Una vez instalados la aplicación, el modelo y la base de conocimiento, CheckCare
          funciona completamente sin conexión a internet. Puedes desactivar el Wi-Fi y completar
          una evaluación para comprobarlo.
        </p>
      </div>

      <p className="footer-note">Consulta docs/privacy.md en el repositorio para más detalle técnico.</p>
    </main>
  )
}
