import express from 'express'
import { router } from './routes.js'
import { logger } from '../logger.js'

// Browsers treat `localhost` and `127.0.0.1` as different origins even
// though both resolve to loopback, so a browser fetch from the Next.js dev
// server (http://localhost:3000) to this Express server (http://127.0.0.1:4111)
// is cross-origin and needs CORS headers — but only for these two exact
// same-machine origins, never a wildcard, keeping this server local-only
// (master prompt section 6/34: bound to 127.0.0.1 in index.ts, never 0.0.0.0).
const ALLOWED_ORIGINS = new Set(['http://localhost:3000', 'http://127.0.0.1:3000'])

export function createServer() {
  const app = express()
  app.use(express.json({ limit: '1mb' }))

  app.use((req, res, next) => {
    const origin = req.headers.origin
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204)
      return
    }
    next()
  })

  app.use((req, _res, next) => {
    logger.info('http_request', { method: req.method, path: req.path })
    next()
  })

  app.use('/api', router)
  app.get('/health', (_req, res) => res.json({ status: 'ok', offline: true }))

  app.use((_req, res) => {
    res.status(404).json({ error: 'not_found', message: 'Ruta no encontrada.' })
  })

  return app
}
