import { fal } from '@fal-ai/client'

// Seedance / Kling via fal.ai. subscribe() blocks until the job completes, then
// returns a hosted video URL we download to bytes.
export async function falVideo({ apiKey, modelId, prompt, seconds }) {
  fal.config({ credentials: apiKey })
  const result = await fal.subscribe(modelId, { input: { prompt, duration: seconds } })
  const url = result.data?.video?.url
  if (!url) throw new Error('fal returned no video url')
  const resp = await fetch(url)
  return Buffer.from(await resp.arrayBuffer())
}
