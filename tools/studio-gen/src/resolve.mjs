import { existsSync } from 'node:fs'
import { route } from './router.mjs'

const DEFAULT_MODEL = { image: 'nano-banana', video: 'seedance' }

export function defaultOut(command, prompt) {
  const slug = (prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)) || 'asset'
  return command === 'image' ? `public/gen/${slug}` : `public/seq/${slug}`
}

export function resolveRequest(parsed) {
  const { command, prompt } = parsed
  if (command !== 'image' && command !== 'video') {
    throw new Error(`command must be "image" or "video", got "${command}"`)
  }
  if (!prompt) throw new Error('a prompt is required')

  const model = parsed.model ?? DEFAULT_MODEL[command]
  const r = route(model)
  if (r.kind !== command) {
    throw new Error(`model "${model}" is a ${r.kind} model, not usable for "${command}"`)
  }
  if (command === 'image' && parsed.cutout && r.provider !== 'openai') {
    throw new Error(`--cutout requires an openai model (got "${model}") — nano-banana does not emit alpha; use --model gpt-image`)
  }

  if (command === 'image') {
    if (parsed.from || parsed.to) throw new Error('--from and --to are for video; to change an image use --edit <image>')
    if (parsed.edit && parsed.cutout) throw new Error('--cutout makes a new image; it can\'t be combined with --edit')
  } else {
    if (parsed.edit) throw new Error('--edit is for image; to start a video from an image use --from <image>')
    if (parsed.to && !parsed.from) throw new Error('--to needs --from: a video model fills the middle between a start and an end frame')
  }
  for (const flag of ['edit', 'from', 'to']) {
    if (parsed[flag] && !existsSync(parsed[flag])) throw new Error(`--${flag} ${parsed[flag]}: no such file`)
  }

  // An edit keeps its source's shape unless asked; a new image defaults to 16:9. Image
  // ratios are checked by each adapter. Video sends a ratio only when asked, and not with
  // --from: the start frame sets the shape, and some image endpoints ignore the field.
  let ratio = parsed.ratio
  if (command === 'image' && !ratio && !parsed.edit) ratio = '16:9'

  if (command === 'video') {
    if (!Number.isFinite(parsed.seconds)) throw new Error('--seconds must be a number')
    if (!Number.isFinite(parsed.fps)) throw new Error('--fps must be a number')
    // Veo needs 8 seconds whenever it's given a last frame.
    const seconds = model === 'veo' && parsed.to ? [8] : r.seconds
    if (!seconds.includes(parsed.seconds)) {
      throw new Error(`--seconds ${parsed.seconds} isn't available on ${model}${seconds === r.seconds ? '' : ' with --to'} (allowed: ${span(seconds)})`)
    }
    if (ratio && parsed.from) throw new Error('--ratio can\'t be used with --from: the start frame sets the shape, so crop it to the ratio you want')
    if (ratio && !r.ratios.includes(ratio)) throw new Error(`${model} does not support --ratio ${ratio} (supported: ${r.ratios.join(', ')})`)
  }

  const params = command === 'image'
    ? { ratio, cutout: parsed.cutout, edit: parsed.edit }
    : { seconds: parsed.seconds, frames: parsed.frames, fps: parsed.fps, ratio, from: parsed.from, to: parsed.to }

  return {
    command,
    model,
    prompt,
    provider: r.provider,
    modelId: (parsed.from && r.imageModelId) || r.modelId,   // veo takes images on its one model
    magnific: r.magnific,
    kind: r.kind,
    out: parsed.out ?? defaultOut(command, prompt),
    params,
  }
}

// 3,4,5,…,15 reads as 3–15.
function span(xs) {
  return xs.length > 3 && xs.every((x, i) => i === 0 || x === xs[i - 1] + 1) ? `${xs[0]}–${xs.at(-1)}` : xs.join(', ')
}

export function formatRequest(req) {
  return [
    `command : ${req.command}`,
    `model   : ${req.model}  (${req.provider} → ${req.modelId})` +
      (req.magnific && (req.magnific.images || !req.params.from)
        ? `\n          (magnific → ${req.magnific.create}, used when the account has a magnific key)` : ''),
    `prompt  : ${req.prompt}`,
    `out     : ${req.out}`,
    `params  : ${JSON.stringify(req.params)}`,
  ].join('\n')
}
