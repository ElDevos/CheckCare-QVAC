#!/usr/bin/env tsx
/**
 * Chunks knowledge/sources/*.json into knowledge/processed/chunks.json, then
 * ingests those chunks into the local QVAC RAG vector store so
 * apps/edge/src/qvac/rag.ts can retrieve them at assessment time.
 *
 * Run: npm run ingest-knowledge
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const SOURCES_DIR = path.join(REPO_ROOT, 'knowledge', 'sources')
const PROCESSED_DIR = path.join(REPO_ROOT, 'knowledge', 'processed')
const CHUNKS_PATH = path.join(PROCESSED_DIR, 'chunks.json')

interface SourceDoc {
  id: string
  title: string
  topic: string
  source: string
  url: string
  version: string
  reviewedAt: string
  content: string
}

interface KnowledgeChunk {
  id: string
  sourceId: string
  content: string
}

const MAX_CHUNK_CHARS = 320

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function chunkSource(doc: SourceDoc): KnowledgeChunk[] {
  const sentences = splitIntoSentences(doc.content)
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence
    if (candidate.length > MAX_CHUNK_CHARS && current) {
      chunks.push(current)
      current = sentence
    } else {
      current = candidate
    }
  }
  if (current) chunks.push(current)

  return chunks.map((content, i) => ({ id: `${doc.id}-c${i + 1}`, sourceId: doc.id, content }))
}

async function main() {
  const files = (await fs.readdir(SOURCES_DIR)).filter((f) => f.endsWith('.json'))
  if (files.length === 0) {
    console.error(`✖ No source files found in ${SOURCES_DIR}`)
    process.exit(1)
  }

  const allChunks: KnowledgeChunk[] = []
  for (const file of files) {
    const raw = await fs.readFile(path.join(SOURCES_DIR, file), 'utf-8')
    const doc: SourceDoc = JSON.parse(raw)
    const chunks = chunkSource(doc)
    allChunks.push(...chunks)
    console.log(`▸ ${doc.id} (${doc.title}) → ${chunks.length} chunk(s)`)
  }

  await fs.mkdir(PROCESSED_DIR, { recursive: true })
  await fs.writeFile(CHUNKS_PATH, JSON.stringify(allChunks, null, 2))
  console.log(`▸ Wrote ${allChunks.length} chunks to ${path.relative(REPO_ROOT, CHUNKS_PATH)}`)

  console.log('▸ Ingesting into local QVAC RAG vector store (this loads the embedding model)...')
  const { ensureKnowledgeIngested, retrieveContext } = await import(
    path.join(REPO_ROOT, 'apps/edge/src/qvac/rag.ts')
  )
  const { embeddingManager } = await import(path.join(REPO_ROOT, 'apps/edge/src/qvac/embeddings.ts'))

  const start = performance.now()
  await ensureKnowledgeIngested()
  console.log(`▸ Ingestion complete in ${Math.round(performance.now() - start)}ms`)

  console.log('▸ Sanity check — searching for "difficulty breathing":')
  const result = await retrieveContext('I am having difficulty breathing', 3)
  for (const s of result.sources) {
    console.log(`   - [${s.id}] ${s.title} (${s.source})`)
  }
  if (result.sources.length === 0) {
    console.error('✖ RAG sanity check returned zero sources — ingestion may have failed.')
    await embeddingManager.unload()
    process.exit(1)
  }

  await embeddingManager.unload()
  console.log('▸ Done.')
}

main().catch((err) => {
  console.error('✖ ingest-knowledge failed:', err)
  process.exit(1)
})
