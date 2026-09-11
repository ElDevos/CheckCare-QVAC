'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

/**
 * Visible proof the app is running locally / offline (master prompt
 * section 24). Polls the edge runtime's own /health, which never makes a
 * network call itself — so this indicator stays accurate even with the
 * machine's internet connection off.
 */
export function LocalAiStatus() {
  const [online, setOnline] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true
    const check = () => {
      api
        .health()
        .then(() => mounted && setOnline(true))
        .catch(() => mounted && setOnline(false))
    }
    check()
    const interval = setInterval(check, 5000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  return (
    <span className="badge badge-offline" title="Ningún dato médico sale de este dispositivo">
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: online ? '#16a34a' : online === false ? '#dc2626' : '#94a3b8',
          display: 'inline-block'
        }}
      />
      IA local {online === false ? '(sin conexión con el motor)' : ''}
    </span>
  )
}
