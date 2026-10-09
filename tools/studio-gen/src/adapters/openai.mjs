import OpenAI, { toFile } from 'openai'

const SIZES = { '16:9': '1536x1024', '4:3': '1536x1152', '1:1': '1024x1024', '9:16': '1024x1536' }

// gpt-image-2 — the modelId router.mjs resolves "gpt-image" to — does not support
// background: "transparent"; the API rejects the request. gpt-image-1.5 is the newest
// model that does. Cutouts pin to it regardless of the modelId passed in, so callers
// can keep using --model gpt-image and just add --cutout. Verified against
// developers.openai.com/api/docs/guides/image-generation (Aug 2026).
const CUTOUT_MODEL = 'gpt-image-1.5'

// With `source`, an edit of that image (images.edit). No --ratio keeps the source's
// shape: the size is left to the API.
export async function openaiImage({ apiKey, modelId, prompt, ratio, cutout, source, client = new OpenAI({ apiKey }) }) {
  if (ratio && !SIZES[ratio]) {
    throw new Error(`openai does not support --ratio ${ratio} (supported: ${Object.keys(SIZES).join(', ')})`)
  }
  if (source) {
    const params = { model: modelId, prompt, n: 1, image: await toFile(source.bytes, 'source.png', { type: source.mimeType }) }
    if (ratio) params.size = SIZES[ratio]
    const res = await client.images.edit(params)
    return Buffer.from(res.data[0].b64_json, 'base64')
  }
  const size = SIZES[ratio] ?? SIZES['16:9']
  const model = cutout ? CUTOUT_MODEL : modelId
  const params = { model, prompt, size, n: 1 }
  if (cutout) {
    params.background = 'transparent'
    params.output_format = 'png'
  }
  const res = await client.images.generate(params)
  return Buffer.from(res.data[0].b64_json, 'base64')
}
