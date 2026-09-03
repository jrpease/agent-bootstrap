import { mkdirSync } from 'node:fs'
import sharp from 'sharp'
import { resolveKey } from './keys.mjs'
import { accountOrThrow } from './account.mjs'
import { geminiImage } from './adapters/gemini.mjs'
import { openaiImage } from './adapters/openai.mjs'

export async function runImage(req) {
  const { account, source: accountSource } = accountOrThrow()
  const { key: apiKey, notice, warning } = resolveKey(req.provider, { account, accountSource })
  if (warning) console.error(warning)
  console.error(notice)

  const png = req.provider === 'openai'
    ? await openaiImage({ apiKey, modelId: req.modelId, prompt: req.prompt, ratio: req.params.ratio, cutout: req.params.cutout })
    : await geminiImage({ apiKey, modelId: req.modelId, prompt: req.prompt, ratio: req.params.ratio })

  mkdirSync(req.out, { recursive: true })
  const base = `${req.out}/asset`
  await sharp(png).webp({ quality: 90 }).toFile(`${base}@2x.webp`)
  const { width } = await sharp(png).metadata()
  await sharp(png).resize(Math.max(1, Math.round((width ?? 2) / 2))).webp({ quality: 90 }).toFile(`${base}.webp`)
  return `${base}.webp`
}
