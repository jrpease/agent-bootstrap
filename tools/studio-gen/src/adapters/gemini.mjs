import { GoogleGenAI } from '@google/genai'
import { readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Aspect ratios Nano Banana accepts. An unsupported value throws rather than being
// dropped: --ratio used to be ignored here entirely, so callers silently got 1:1.
const RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9']

// Nano Banana image generation, or an edit of `source` when given. Returns raw image
// bytes (PNG).
export async function geminiImage({ apiKey, modelId, prompt, ratio, source, ai = new GoogleGenAI({ apiKey }) }) {
  if (ratio && !RATIOS.includes(ratio)) {
    throw new Error(`gemini does not support --ratio ${ratio} (supported: ${RATIOS.join(', ')})`)
  }
  const config = ratio ? { imageConfig: { aspectRatio: ratio } } : undefined
  const contents = source
    ? [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: source.mimeType, data: source.bytes.toString('base64') } }] }]
    : prompt
  const res = await ai.models.generateContent({ model: modelId, contents, config })
  const parts = res.candidates?.[0]?.content?.parts ?? []
  const img = parts.find((p) => p.inlineData?.data)
  if (!img) throw new Error('gemini returned no image data')
  return Buffer.from(img.inlineData.data, 'base64')
}

// Veo video generation (long-running operation → poll → download). Note: Omni Flash
// is NOT this path — it is not a long-running/predictLongRunning model and needs a
// separate adapter. Veo 3.1 accepts only discrete durations (4, 6, 8 seconds), and only
// 8 with a last frame; resolve.mjs enforces both.
export async function geminiVideo({ apiKey, modelId, prompt, seconds, ratio, start, end, ai = new GoogleGenAI({ apiKey }), pollMs = 10000 }) {
  const image = (f) => ({ imageBytes: f.bytes.toString('base64'), mimeType: f.mimeType })
  const config = { durationSeconds: seconds }
  if (ratio) config.aspectRatio = ratio
  if (end) config.lastFrame = image(end)
  const params = { model: modelId, prompt, config }
  if (start) params.image = image(start)
  let op = await ai.models.generateVideos(params)
  while (!op.done) {
    await new Promise((r) => setTimeout(r, pollMs))
    op = await ai.operations.getVideosOperation({ operation: op })
  }
  const video = op.response.generatedVideos[0].video
  // files.download() returns void and writes to downloadPath — read it back to bytes.
  const tmp = join(tmpdir(), `studio-gen-veo-${process.pid}-${(op.name ?? 'op').replace(/[^\w.-]/g, '_')}.mp4`)
  await ai.files.download({ file: video, downloadPath: tmp })
  const buf = readFileSync(tmp)
  rmSync(tmp, { force: true })
  return buf
}
