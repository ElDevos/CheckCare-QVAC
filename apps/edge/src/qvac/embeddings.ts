import { loadModel, unloadModel, EMBEDDING_MODEL_SRC } from './qvac-client.js'
import { logger } from '../logger.js'

/**
 * Manages the embedding model (EmbeddingGemma-300M, Q4_0 GGUF) used for RAG.
 * Separate from ModelManager (MedPsy) because both models can be resident
 * in memory simultaneously — RAG retrieval happens before the MedPsy call.
 */
class EmbeddingManager {
  private modelId: string | null = null
  private loadPromise: Promise<string> | null = null

  async ensureLoaded(): Promise<string> {
    if (this.modelId) return this.modelId
    if (this.loadPromise) return this.loadPromise

    logger.info('embedding_model_load_start')
    const start = performance.now()
    this.loadPromise = loadModel({ modelSrc: EMBEDDING_MODEL_SRC })
      .then((id) => {
        this.modelId = id
        logger.info('embedding_model_load_complete', { modelId: id, loadTimeMs: Math.round(performance.now() - start) })
        return id
      })
      .catch((err) => {
        logger.error('embedding_model_load_failed', { error: err instanceof Error ? err.message : String(err) })
        throw err
      })
      .finally(() => {
        this.loadPromise = null
      })
    return this.loadPromise
  }

  async unload(): Promise<void> {
    if (!this.modelId) return
    const id = this.modelId
    this.modelId = null
    await unloadModel({ modelId: id })
    logger.info('embedding_model_unloaded', { modelId: id })
  }
}

export const embeddingManager = new EmbeddingManager()
