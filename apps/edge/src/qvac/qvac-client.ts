/**
 * QVAC client — the ONLY module in CheckCare that imports `@qvac/sdk`.
 *
 * Every other module (ModelManager, MedPsy service, RAG, benchmark) goes
 * through this file. That keeps the QVAC dependency isolated so it is easy
 * to audit "is this really using QVAC" (master prompt section 18) and keeps
 * the browser from ever talking to QVAC directly (section 34).
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  loadModel,
  completion,
  unloadModel,
  embed,
  ragIngest,
  ragSearch,
  ragChunk,
  ragCloseWorkspace,
  getSystemResources,
  EMBEDDINGGEMMA_300M_Q4_0
} from '@qvac/sdk'
import { logger } from '../logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
export const MODELS_DIR = path.join(REPO_ROOT, 'models')

export const MEDPSY_MODEL_FILE = 'medpsy-1.7b-q4_k_m-imat.gguf'
export const MEDPSY_MODEL_PATH = path.join(MODELS_DIR, MEDPSY_MODEL_FILE)
export const MEDPSY_QUANTIZATION = 'Q4_K_M'
export const MEDPSY_CONTEXT_LENGTH = 4096

export const EMBEDDING_MODEL_SRC = EMBEDDINGGEMMA_300M_Q4_0

export {
  loadModel,
  completion,
  unloadModel,
  embed,
  ragIngest,
  ragSearch,
  ragChunk,
  ragCloseWorkspace,
  getSystemResources
}

export async function fileExists(p: string): Promise<boolean> {
  const fs = await import('node:fs/promises')
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export async function isModelInstalled(): Promise<boolean> {
  return fileExists(MEDPSY_MODEL_PATH)
}

logger.info('qvac_client_initialized', { modelPath: MEDPSY_MODEL_PATH })
