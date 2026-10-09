import { fal } from '@fal-ai/client'

// The start-frame field differs per image-to-video endpoint; the end frame is
// end_image_url on both.
const START_FIELD = {
  'bytedance/seedance-2.0/image-to-video': 'image_url',
  'fal-ai/kling-video/v3/standard/image-to-video': 'start_image_url',
}

// Seedance / Kling via fal.ai. subscribe() blocks until the job completes, then
// returns a hosted video URL we download to bytes. Frames go as Blobs, which
// subscribe() uploads to fal storage and replaces with their URLs.
export async function falVideo({ apiKey, modelId, prompt, seconds, ratio, start, end, client = fal, fetchImpl = fetch }) {
  client.config({ credentials: apiKey })
  const input = { prompt, duration: String(seconds) }
  if (ratio) input.aspect_ratio = ratio
  if (start) {
    const field = START_FIELD[modelId]
    if (!field) throw new Error(`fal: no start-frame field known for ${modelId}`)
    input[field] = new Blob([start.bytes], { type: start.mimeType })
  }
  if (end) input.end_image_url = new Blob([end.bytes], { type: end.mimeType })
  const result = await client.subscribe(modelId, { input })
  const url = result.data?.video?.url
  if (!url) throw new Error('fal returned no video url')
  const resp = await fetchImpl(url)
  return Buffer.from(await resp.arrayBuffer())
}
