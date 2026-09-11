#!/usr/bin/env tsx
/**
 * Real benchmark runner (master prompt section 31). Every number here is
 * measured against the actual QVAC SDK + MedPsy GGUF running on this
 * machine — nothing is fabricated. Run: npm run benchmark
 */
import os from 'node:os'
import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { BenchmarkRecord } from '@checkcare/shared-types'
import { loadModel, completion, unloadModel, MEDPSY_MODEL_PATH, MEDPSY_QUANTIZATION } from './qvac-client.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const REPORTS_DIR = path.join(REPO_ROOT, 'evaluation', 'reports')

const PROMPTS = [
  'I have had a mild headache and a low-grade fever for one day. What general, non-diagnostic guidance can you give me?',
  'I have been coughing for three days and feel tired. What should I watch for?',
  'My stomach hurts and I feel nauseous after eating. What general guidance applies here?'
]

function getDeviceName(): string {
  try {
    return execSync('sysctl -n machdep.cpu.brand_string').toString().trim()
  } catch {
    return os.cpus()[0]?.model ?? 'unknown'
  }
}

async function main() {
  console.log('▸ CheckCare benchmark — real local inference, no fabricated numbers')
  const device = getDeviceName()
  const osName = os.platform() === 'darwin' ? 'macOS' : os.platform()
  const architecture = os.arch()

  console.log(`▸ Device: ${device} | OS: ${osName} | Arch: ${architecture}`)

  const loadStart = performance.now()
  const modelId = await loadModel({
    modelSrc: MEDPSY_MODEL_PATH,
    modelType: 'llamacpp-completion',
    modelConfig: { ctx_size: 4096, reasoning_budget: 0 }
  })
  const modelLoadTimeMs = performance.now() - loadStart
  console.log(`▸ Model loaded in ${modelLoadTimeMs.toFixed(0)}ms`)

  const records: BenchmarkRecord[] = []

  for (const [i, prompt] of PROMPTS.entries()) {
    console.log(`\n▸ Prompt ${i + 1}/${PROMPTS.length}`)
    const wallStart = performance.now()
    let firstTokenAt: number | null = null

    const result = completion({
      modelId,
      history: [{ role: 'user', content: prompt }],
      stream: true,
      generationParams: { temp: 0.3, predict: 256 }
    })

    let text = ''
    for await (const token of result.tokenStream) {
      if (firstTokenAt === null) firstTokenAt = performance.now()
      text += token
    }
    const genEnd = performance.now()
    const stats = await result.stats

    const record: BenchmarkRecord = {
      timestamp: new Date().toISOString(),
      device,
      os: osName,
      architecture,
      model: 'MedPsy-1.7B',
      quantization: MEDPSY_QUANTIZATION,
      modelLoadTimeMs: i === 0 ? Math.round(modelLoadTimeMs) : 0,
      inputTokens: stats?.promptTokens ?? 0,
      outputTokens: stats?.generatedTokens ?? 0,
      timeToFirstTokenMs: firstTokenAt ? Math.round(firstTokenAt - wallStart) : 0,
      generationTimeMs: Math.round(genEnd - wallStart),
      tokensPerSecond: stats?.tokensPerSecond ?? 0,
      backendDevice: stats?.backendDevice ?? 'unknown'
    }
    records.push(record)
    console.log(
      `   TTFT: ${record.timeToFirstTokenMs}ms | gen: ${record.generationTimeMs}ms | ${record.tokensPerSecond.toFixed(1)} tok/s | backend: ${record.backendDevice}`
    )
  }

  await unloadModel({ modelId })

  await fs.mkdir(REPORTS_DIR, { recursive: true })
  const outPath = path.join(REPORTS_DIR, `benchmark-${Date.now()}.json`)
  await fs.writeFile(outPath, JSON.stringify(records, null, 2))

  const avgTps = records.reduce((s, r) => s + r.tokensPerSecond, 0) / records.length
  const avgTtft = records.reduce((s, r) => s + r.timeToFirstTokenMs, 0) / records.length
  console.log(`\n▸ Wrote ${records.length} records to ${path.relative(REPO_ROOT, outPath)}`)
  console.log(`▸ Average: ${avgTps.toFixed(1)} tok/s, TTFT ${avgTtft.toFixed(0)}ms, load ${modelLoadTimeMs.toFixed(0)}ms`)
}

main().catch((err) => {
  console.error('✖ Benchmark failed:', err)
  process.exit(1)
})
