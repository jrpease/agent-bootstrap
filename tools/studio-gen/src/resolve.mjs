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

  const params = command === 'image'
    ? { ratio: parsed.ratio, cutout: parsed.cutout }
    : { seconds: parsed.seconds, frames: parsed.frames, fps: parsed.fps }

  if (command === 'video') {
    if (!Number.isFinite(parsed.seconds)) throw new Error('--seconds must be a number')
    if (!Number.isFinite(parsed.fps)) throw new Error('--fps must be a number')
  }

  return {
    command,
    model,
    prompt,
    provider: r.provider,
    modelId: r.modelId,
    magnific: r.magnific,
    kind: r.kind,
    out: parsed.out ?? defaultOut(command, prompt),
    params,
  }
}

export function formatRequest(req) {
  return [
    `command : ${req.command}`,
    `model   : ${req.model}  (${req.provider} → ${req.modelId})` +
      (req.magnific ? `\n          (magnific → ${req.magnific.create}, used when the account has a magnific key)` : ''),
    `prompt  : ${req.prompt}`,
    `out     : ${req.out}`,
    `params  : ${JSON.stringify(req.params)}`,
  ].join('\n')
}
