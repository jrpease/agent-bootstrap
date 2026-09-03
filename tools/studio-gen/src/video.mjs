import { mkdirSync, writeFileSync } from 'node:fs'
import { resolveKey } from './keys.mjs'
import { accountOrThrow } from './account.mjs'
import { geminiVideo } from './adapters/gemini.mjs'
import { falVideo } from './adapters/fal.mjs'
import { extractFrames } from './frames.mjs'

export async function runVideo(req) {
  const { account, source: accountSource } = accountOrThrow()
  const { key: apiKey, notice, warning } = resolveKey(req.provider, { account, accountSource })
  if (warning) console.error(warning)
  console.error(notice)

  const bytes = req.provider === 'fal'
    ? await falVideo({ apiKey, modelId: req.modelId, prompt: req.prompt, seconds: req.params.seconds })
    : await geminiVideo({ apiKey, modelId: req.modelId, prompt: req.prompt, seconds: req.params.seconds })

  mkdirSync(req.out, { recursive: true })
  const mp4 = `${req.out}/clip.mp4`
  writeFileSync(mp4, bytes)

  if (req.params.frames) {
    const n = await extractFrames(mp4, `${req.out}/frames`, req.params.fps)
    return `${req.out}/frames (${n} frames from ${mp4})`
  }
  return mp4
}
