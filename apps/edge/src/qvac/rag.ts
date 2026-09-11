import fs from 'node:fs/promises'
import path from 'node:path'
import type { SourceReference } from '@checkcare/shared-types'
import { ragIngest, ragSearch, REPO_ROOT } from './qvac-client.js'
import { embeddingManager } from './embeddings.js'
import { logger } from '../logger.js'

/**
 * Local RAG over the CheckCare knowledge base.
 *
 * QVAC's built-in `ragIngest`/`ragSearch` (the "prototype" vector store —
 * see docs.qvac.tether.io/ai-capabilities/rag) only round-trips
 * `{id, content, score}` per hit; it does not pass arbitrary per-document
 * metadata through search. To guarantee every citation shown to the user
 * traces back to a real, versioned knowledge-base entry (master prompt
 * section 22, "no source that doesn't exist in the knowledge base"), each
 * ingested chunk is tagged with a machine-parseable
 * `[[sourceId#chunkId]]` prefix that we strip back out and resolve against
 * `knowledge/manifest.json` after retrieval — never against model output.
 */

const WORKSPACE = 'checkcare-knowledge'
const KNOWLEDGE_DIR = path.join(REPO_ROOT, 'knowledge')
const PROCESSED_CHUNKS_PATH = path.join(KNOWLEDGE_DIR, 'processed', 'chunks.json')
const MANIFEST_PATH = path.join(KNOWLEDGE_DIR, 'manifest.json')

const TAG_RE = /^\[\[([^\]#]+)#([^\]]+)\]\]\s*/

interface ManifestSource {
  id: string
  title: string
  topic: string
  source: string
  url: string
}

interface KnowledgeChunk {
  id: string
  sourceId: string
  content: string
}

let manifestCache: ManifestSource[] | null = null
let ingested = false
let ingestPromise: Promise<void> | null = null

async function loadManifest(): Promise<ManifestSource[]> {
  if (manifestCache) return manifestCache
  const raw = await fs.readFile(MANIFEST_PATH, 'utf-8')
  manifestCache = JSON.parse(raw).sources as ManifestSource[]
  return manifestCache
}

export async function ensureKnowledgeIngested(): Promise<void> {
  if (ingested) return
  if (ingestPromise) return ingestPromise

  ingestPromise = (async () => {
    const raw = await fs.readFile(PROCESSED_CHUNKS_PATH, 'utf-8').catch(() => null)
    if (!raw) {
      logger.warn('rag_no_processed_chunks', { path: PROCESSED_CHUNKS_PATH })
      ingested = true
      return
    }
    const chunks: KnowledgeChunk[] = JSON.parse(raw)
    const modelId = await embeddingManager.ensureLoaded()
    const documents = chunks.map((c) => `[[${c.sourceId}#${c.id}]] ${c.content}`)

    logger.info('rag_ingest_start', { count: documents.length })
    const result = await ragIngest({ modelId, workspace: WORKSPACE, documents, chunk: false })
    logger.info('rag_ingest_complete', { processed: result.processed.length, dropped: result.droppedIndices.length })
    ingested = true
  })().finally(() => {
    ingestPromise = null
  })

  return ingestPromise
}

export interface RetrievedContext {
  sources: SourceReference[]
  /** Cleaned (tag-stripped) chunk text, in the same order as `sources`, for prompt construction. */
  contextText: string[]
}

export async function retrieveContext(query: string, topK = 4): Promise<RetrievedContext> {
  await ensureKnowledgeIngested()
  const manifest = await loadManifest()
  const modelId = await embeddingManager.ensureLoaded()

  const hits = await ragSearch({ modelId, workspace: WORKSPACE, query, topK })

  const sources: SourceReference[] = []
  const contextText: string[] = []
  const seenSourceIds = new Set<string>()

  for (const hit of hits) {
    const match = TAG_RE.exec(hit.content)
    if (!match) continue
    const [, sourceId] = match
    const manifestEntry = manifest.find((m) => m.id === sourceId)
    if (!manifestEntry) {
      // A chunk that doesn't resolve to a known manifest entry is dropped
      // rather than surfaced — never show an unverifiable source.
      logger.warn('rag_unresolvable_source', { sourceId })
      continue
    }
    const cleaned = hit.content.replace(TAG_RE, '')
    contextText.push(cleaned)
    if (!seenSourceIds.has(manifestEntry.id)) {
      seenSourceIds.add(manifestEntry.id)
      sources.push({
        id: manifestEntry.id,
        title: manifestEntry.title,
        source: manifestEntry.source,
        url: manifestEntry.url,
        topic: manifestEntry.topic
      })
    }
  }

  return { sources, contextText }
}

/** Used by the Response Validator to confirm a cited source id is real. */
export async function isKnownSourceId(id: string): Promise<boolean> {
  const manifest = await loadManifest()
  return manifest.some((m) => m.id === id)
}
