import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import { LocalAiStatus } from '@/components/LocalAiStatus'

export const metadata: Metadata = {
  title: 'CheckCare — Orientación de salud con IA local',
  description: 'Asistente de orientación temprana sobre síntomas, con IA médica ejecutándose localmente (QVAC + MedPsy).'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="app-header">
          <Link href="/" className="brand">
            <span className="brand-mark">C</span>
            CheckCare
          </Link>
          <LocalAiStatus />
        </header>
        {children}
      </body>
    </html>
  )
}
