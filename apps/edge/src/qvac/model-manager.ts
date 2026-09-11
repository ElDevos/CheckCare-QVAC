import type { ModelInfo, ModelStatus } from '@checkcare/shared-types'
import {
  loadModel,
  unloadModel,
  isModelInstalled,
  MEDPSY_MODEL_PATH,
  MEDPSY_QUANTIZATION,
  MEDPSY_CONTEXT_LENGTH
} from './qvac-client.js'
import { logger } from '../logger.js'

/**
 * ModelManager — owns the MedPsy model lifecycle (master prompt section 17).
 *
 * Loads the model once, keeps it resident, and serializes access so two
 * requests never try to run completion() concurrently against the same
 * loaded model id (the underlying llama.cpp addon is not safe for that
 * without `modelConfig.parallel`, which we do not enable here).
 */
class ModelManager {
  private status: ModelStatus = 'NOT_INSTALLED'
  private modelId: string | null = null
  private loadedAt: string | null = null
  private lastError: string | null = null
  private loadPromise: Promise<string> | null = null
  private busyQueue: Promise<unknown> = Promise.resolve()

  getStatus(): ModelStatus {
    return this.status
  }

  getModelId(): string | null {
    return this.modelId
  }

  async getInfo(): Promise<ModelInfo> {
    const installed = await isModelInstalled()
    return {
      name: 'MedPsy-1.7B',
      quantization: MEDPSY_QUANTIZATION,
      runtime: 'QVAC / llama.cpp',
      backend: 'llamacpp-completion',
      execution: 'local',
      remoteAI: 'none',
      approxSizeBytes: 1282439360,
      contextLength: MEDPSY_CONTEXT_LENGTH,
      installedAt: this.loadedAt,
      status: installed ? this.status : 'NOT_INSTALLED'
    }
  }

  /** Ensures the model is loaded, loading it at most once even under concurrent calls. */
  async ensureLoaded(): Promise<string> {
    if (this.modelId && this.status === 'READY') return this.modelId
    if (this.status === 'BUSY' && this.modelId) return this.modelId
    if (this.loadPromise) return this.loadPromise

    const installed = await isModelInstalled()
    if (!installed) {
      this.status = 'NOT_INSTALLED'
      throw new ModelNotInstalledError()
    }

    this.status = 'LOADING'
    logger.info('model_load_start', { path: MEDPSY_MODEL_PATH })
    const start = performance.now()

    this.loadPromise = loadModel({
      modelSrc: MEDPSY_MODEL_PATH,
      modelType: 'llamacpp-completion',
      modelConfig: {
        ctx_size: MEDPSY_CONTEXT_LENGTH,
        reasoning_budget: 0
      }
    })
      .then((id) => {
        this.modelId = id
        this.status = 'READY'
        this.loadedAt = new Date().toISOString()
        this.lastError = null
        const ms = performance.now() - start
        logger.info('model_load_complete', { modelId: id, loadTimeMs: Math.round(ms) })
        return id
      })
      .catch((err) => {
        this.status = 'ERROR'
        this.lastError = err instanceof Error ? err.message : String(err)
        logger.error('model_load_failed', { error: this.lastError })
        throw new ModelLoadError(this.lastError)
      })
      .finally(() => {
        this.loadPromise = null
      })

    return this.loadPromise
  }

  /**
   * Runs `task` with exclusive access to the loaded model, marking status
   * BUSY for the duration. Requests queue rather than overlapping.
   */
  async withModel<T>(task: (modelId: string) => Promise<T>): Promise<T> {
    const run = this.busyQueue.then(async () => {
      const modelId = await this.ensureLoaded()
      this.status = 'BUSY'
      try {
        return await task(modelId)
      } finally {
        this.status = this.modelId ? 'READY' : 'ERROR'
      }
    })
    // Keep the queue chain alive even if this task rejects.
    this.busyQueue = run.catch(() => undefined)
    return run
  }

  async unload(): Promise<void> {
    if (!this.modelId) return
    this.status = 'UNLOADING'
    const id = this.modelId
    try {
      await unloadModel({ modelId: id })
      logger.info('model_unloaded', { modelId: id })
    } finally {
      this.modelId = null
      this.status = 'NOT_INSTALLED'
      this.loadedAt = null
    }
  }

  getLastError(): string | null {
    return this.lastError
  }
}

export class ModelNotInstalledError extends Error {
  constructor() {
    super('MedPsy model is not installed. Run scripts/setup-model.sh.')
    this.name = 'ModelNotInstalledError'
  }
}

export class ModelLoadError extends Error {
  constructor(cause: string | null) {
    super(`Failed to load MedPsy model: ${cause ?? 'unknown error'}`)
    this.name = 'ModelLoadError'
  }
}

export const modelManager = new ModelManager()
