// Seedance / Kling via the Magnific API. Async: POST returns a task_id, then we
// poll until COMPLETED and download the first generated URL. The create and
// poll paths differ per model (seedance-2-pro-720p polls at seedance-2-pro),
// so the route supplies both.
const BASE = 'https://api.magnific.com/v1/ai'

//
// A route's `ratios` maps --ratio to the model's own names (Seedance's enum); without it
// the ratio goes as given. Frames go as base64 in `image` / `image_end`, which only
// Seedance documents; pickProvider keeps image requests for other models on fal.
export async function magnificVideo({ apiKey, modelId, prompt, seconds, ratio, start, end, fetchImpl = fetch, pollMs = 5000, timeoutMs = 15 * 60 * 1000 }) {
  const { create, poll, durationAs, ratios } = modelId
  const headers = { 'x-magnific-api-key': apiKey, 'content-type': 'application/json' }
  const body = { prompt, duration: durationAs === 'string' ? String(seconds) : seconds }
  if (ratio) body.aspect_ratio = ratios?.[ratio] ?? ratio
  if (start) body.image = start.bytes.toString('base64')
  if (end) body.image_end = end.bytes.toString('base64')

  const started = await call(fetchImpl, `${BASE}/${create}`, { method: 'POST', headers, body: JSON.stringify(body) })
  const taskId = started.data?.task_id
  if (!taskId) throw new Error(`magnific returned no task_id: ${JSON.stringify(started)}`)

  const deadline = Date.now() + timeoutMs
  for (;;) {
    const { data } = await call(fetchImpl, `${BASE}/${poll}/${taskId}`, { headers })
    if (data?.status === 'COMPLETED') {
      const url = data.generated?.[0]
      if (!url) throw new Error('magnific task completed with no video url')
      const resp = await fetchImpl(url)
      if (!resp.ok) throw new Error(`magnific video download failed: HTTP ${resp.status}`)
      return Buffer.from(await resp.arrayBuffer())
    }
    if (data?.status === 'FAILED') throw new Error(`magnific task ${taskId} failed`)
    if (Date.now() > deadline) throw new Error(`magnific task ${taskId} still ${data?.status} after ${timeoutMs / 60000} min`)
    await new Promise((r) => setTimeout(r, pollMs))
  }
}

async function call(fetchImpl, url, init) {
  const resp = await fetchImpl(url, init)
  const text = await resp.text()
  if (!resp.ok) throw new Error(`magnific HTTP ${resp.status}: ${text}`)
  return JSON.parse(text)
}
