import { createServer } from './api/server.js'
import { modelManager } from './qvac/model-manager.js'
import { isModelInstalled } from './qvac/qvac-client.js'
import { logger } from './logger.js'

const PORT = Number(process.env.CHECKCARE_EDGE_PORT ?? 4111)
const HOST = '127.0.0.1' // Local-only — never listen on 0.0.0.0 (master prompt section 23).

async function main() {
  const app = createServer()

  const server = app.listen(PORT, HOST, () => {
    logger.info('edge_server_started', { host: HOST, port: PORT })
    console.log(`▸ CheckCare Edge Runtime listening on http://${HOST}:${PORT}`)
  })

  const installed = await isModelInstalled()
  if (installed) {
    // Preload MedPsy at startup so the first real request doesn't pay the
    // ~10s load cost. Failure here is logged but not fatal — /api/model/status
    // will surface the ERROR state and each request retries loading.
    modelManager.ensureLoaded().catch((err) => {
      logger.error('startup_model_preload_failed', { error: err instanceof Error ? err.message : String(err) })
    })
  } else {
    logger.warn('startup_model_missing', { hint: 'run scripts/setup-model.sh' })
  }

  const shutdown = async (signal: string) => {
    logger.info('edge_server_shutdown', { signal })
    server.close()
    await modelManager.unload().catch(() => undefined)
    process.exit(0)
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((err) => {
  logger.error('edge_fatal_startup_error', { error: err instanceof Error ? err.message : String(err) })
  process.exit(1)
})
