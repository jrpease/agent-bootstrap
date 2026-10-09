import { mkdirSync, writeFileSync } from 'node:fs'
import { resolveKey } from './keys.mjs'
import { accountOrThrow } from './account.mjs'
import { geminiVideo } from './adapters/gemini.mjs'
import { falVideo } from './adapters/fal.mjs'
import { magnificVideo } from './adapters/magnific.mjs'
import { extractFrames } from './frames.mjs'
import { frameJpeg } from './inputs.mjs'

// A route with a `magnific` entry prefers it whenever the account has a magnific
// key, and falls back to the route's own provider (fal) otherwise. A request with
// frames stays on fal when the Magnific entry can't take images.
export function pickProvider(req, opts, resolve = resolveKey) {
  if (!req.magnific) return { provider: req.provider, modelId: req.modelId, ...resolve(req.provider, opts) }
  if (req.params.from && !req.magnific.images) {
    try {
      return { provider: req.provider, modelId: req.modelId, ...resolve(req.provider, opts) }
    } catch (e) {
      throw new Error(`${e.message}\n\n"${req.model}" with --from needs a ${req.provider} key: Magnific's ${req.model} only takes image URLs, not local files.`)
    }
  }
  let magnificErr
  try {
    return { provider: 'magnific', modelId: req.magnific, ...resolve('magnific', opts) }
  } catch (e) {
    magnificErr = e
  }
  try {
    return { provider: req.provider, modelId: req.modelId, ...resolve(req.provider, opts) }
  } catch (e) {
    throw new Error(`${e.message}\n\nNo magnific key either (it is preferred for "${req.model}"):\n${magnificErr.message}`)
  }
}

export async function runVideo(req) {
  const { account, source: accountSource } = accountOrThrow()
  const { provider, modelId, key: apiKey, notice, warning } = pickProvider(req, { account, accountSource })
  if (warning) console.error(warning)
  console.error(notice)

  const { seconds, ratio, from, to } = req.params
  const args = {
    apiKey, modelId, prompt: req.prompt, seconds, ratio,
    start: from ? await frameJpeg(from) : undefined,
    end: to ? await frameJpeg(to) : undefined,
  }
  const bytes = provider === 'magnific' ? await magnificVideo(args)
    : provider === 'fal' ? await falVideo(args)
    : await geminiVideo(args)

  mkdirSync(req.out, { recursive: true })
  const mp4 = `${req.out}/clip.mp4`
  writeFileSync(mp4, bytes)

  if (req.params.frames) {
    const n = await extractFrames(mp4, `${req.out}/frames`, req.params.fps)
    return `${req.out}/frames (${n} frames from ${mp4})`
  }
  return mp4
}
