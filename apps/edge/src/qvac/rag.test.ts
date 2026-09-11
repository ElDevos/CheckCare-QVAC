import { describe, it, expect, afterAll } from 'vitest'
import fs from 'node:fs'
import { retrieveContext, isKnownSourceId } from './rag.js'
import { embeddingManager } from './embeddings.js'
import { MEDPSY_MODEL_PATH } from './qvac-client.js'

/**
 * Integration test (master prompt section 33: "Comprobar que las fuentes
 * recuperadas existen") — this is intentionally NOT mocked. It exercises
 * the real QVAC embedding model and the real local RAG vector store built
 * by `npm run ingest-knowledge`.
 *
 * Skips automatically if the model hasn't been downloaded yet (e.g. a
 * fresh clone before `npm run setup-model`), so `npm test` still passes in
 * that state — but on this development machine it runs for real.
 */
const modelInstalled = fs.existsSync(MEDPSY_MODEL_PATH)

describe.skipIf(!modelInstalled)('RAG retrieval (real QVAC embedding model + vector store)', () => {
  afterAll(async () => {
    await embeddingManager.unload()
  })

  it('every retrieved source resolves to a real knowledge-base manifest entry', async () => {
    const { sources } = await retrieveContext('I am having severe difficulty breathing', 3)
    expect(sources.length).toBeGreaterThan(0)
    for (const s of sources) {
      const known = await isKnownSourceId(s.id)
      expect(known).toBe(true)
      expect(s.url).toMatch(/^https:\/\//)
    }
  })

  it('retrieves the breathing-related source for a breathing-related query', async () => {
    const { sources } = await retrieveContext('I cannot breathe and am gasping for air', 3)
    expect(sources.some((s) => s.topic === 'breathing_difficulty')).toBe(true)
  })

  it('rejects an unknown source id', async () => {
    const known = await isKnownSourceId('source-does-not-exist')
    expect(known).toBe(false)
  })
})
