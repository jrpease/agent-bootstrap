import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { resolveRequest, formatRequest } from '../src/resolve.mjs'
import { pickProvider } from '../src/video.mjs'
import { frameJpeg, editPng } from '../src/inputs.mjs'
import { falVideo } from '../src/adapters/fal.mjs'
import { magnificVideo } from '../src/adapters/magnific.mjs'
import { geminiVideo, geminiImage } from '../src/adapters/gemini.mjs'
import { openaiImage } from '../src/adapters/openai.mjs'

// --edit, --from, --to, video --ratio and per-model --seconds.
// Every adapter here gets a fake client, so nothing reaches the network.

let dir, still
before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'studio-gen-test-'))
  still = join(dir, 'still.webp')
  writeFileSync(still, await sharp({ create: { width: 64, height: 36, channels: 4, background: '#f00' } }).webp().toBuffer())
})
after(() => rmSync(dir, { recursive: true, force: true }))

const video = (o = {}) => resolveRequest({ command: 'video', prompt: 'x', seconds: 8, fps: 30, frames: false, ...o })
const image = (o = {}) => resolveRequest({ command: 'image', prompt: 'x', ...o })

test('a new image defaults to 16:9; an edit keeps its source shape', () => {
  assert.equal(image().params.ratio, '16:9')
  assert.equal(image({ edit: still }).params.ratio, undefined)
  assert.equal(image({ edit: still, ratio: '1:1' }).params.ratio, '1:1')
})

test('rejects flags on the wrong command, --to alone, and a missing file', () => {
  assert.throws(() => image({ from: still }), /--from and --to are for video/)
  assert.throws(() => video({ edit: still }), /--edit is for image/)
  assert.throws(() => video({ to: still }), /--to needs --from/)
  assert.throws(() => video({ from: join(dir, 'nope.png') }), /--from .*no such file/)
  assert.throws(() => image({ model: 'gpt-image', edit: still, cutout: true }), /can't be combined with --edit/)
})

test('--from switches to the image-to-video endpoint; veo keeps its one model', () => {
  assert.equal(video({ from: still }).modelId, 'bytedance/seedance-2.0/image-to-video')
  assert.equal(video({ model: 'kling', from: still, to: still }).modelId, 'fal-ai/kling-video/v3/standard/image-to-video')
  assert.equal(video({ model: 'veo', from: still }).modelId, 'veo-3.1-generate-preview')
  assert.equal(video().modelId, 'bytedance/seedance-2.0/text-to-video')
})

test('--seconds is checked per model, and veo with --to needs 8', () => {
  assert.throws(() => video({ seconds: 16 }), /--seconds 16 isn't available on seedance \(allowed: 4–15\)/)
  assert.throws(() => video({ model: 'kling', seconds: 2 }), /allowed: 3–15/)
  assert.throws(() => video({ model: 'veo', seconds: 5 }), /allowed: 4, 6, 8/)
  assert.throws(() => video({ model: 'veo', seconds: 6, from: still, to: still }), /on veo with --to \(allowed: 8\)/)
  assert.equal(video({ model: 'veo', seconds: 6, from: still }).params.seconds, 6)
})

test('video --ratio is checked per model and refused with --from', () => {
  assert.equal(video({ ratio: '9:16' }).params.ratio, '9:16')
  assert.equal(video().params.ratio, undefined)
  assert.throws(() => video({ model: 'veo', ratio: '1:1' }), /veo does not support --ratio 1:1 \(supported: 16:9, 9:16\)/)
  assert.throws(() => video({ ratio: '9:16', from: still }), /start frame sets the shape/)
})

const keysFor = (have) => (provider) => {
  if (!have.includes(provider)) throw new Error(`no ${provider} key`)
  return { key: `${provider}-key`, notice: provider }
}

test('kling with frames stays on fal; seedance with frames still prefers magnific', () => {
  assert.equal(pickProvider(video({ model: 'kling', from: still }), {}, keysFor(['magnific', 'fal'])).provider, 'fal')
  assert.equal(pickProvider(video({ model: 'kling' }), {}, keysFor(['magnific', 'fal'])).provider, 'magnific')
  assert.equal(pickProvider(video({ from: still }), {}, keysFor(['magnific', 'fal'])).provider, 'magnific')
})

test('kling with frames and only a magnific key says why it needs fal', () => {
  const req = video({ model: 'kling', from: still })
  assert.throws(() => pickProvider(req, {}, keysFor(['magnific'])), /no fal key[\s\S]*Magnific's kling only takes image URLs/)
  assert.doesNotMatch(formatRequest(req), /magnific/)
  assert.match(formatRequest(video({ from: still })), /magnific/)
})

test('inputs are re-encoded: frames as JPEG, edits as PNG', async () => {
  const f = await frameJpeg(still)
  assert.equal(f.mimeType, 'image/jpeg')
  assert.equal((await sharp(f.bytes).metadata()).format, 'jpeg')
  const e = await editPng(still)
  assert.equal((await sharp(e.bytes).metadata()).format, 'png')
})

const frame = { bytes: Buffer.from('abc'), mimeType: 'image/jpeg' }

function fakeFal() {
  const calls = []
  return {
    calls,
    config() {},
    async subscribe(modelId, { input }) { calls.push({ modelId, input }); return { data: { video: { url: 'https://v' } } } },
  }
}
const fakeDownload = async () => ({ arrayBuffer: async () => new Uint8Array([1]).buffer })

test('fal sends duration as a string, the ratio, and frames under each endpoint\'s names', async () => {
  const client = fakeFal()
  await falVideo({ apiKey: 'k', modelId: 'bytedance/seedance-2.0/text-to-video', prompt: 'p', seconds: 8, ratio: '9:16', client, fetchImpl: fakeDownload })
  assert.deepEqual(client.calls[0].input, { prompt: 'p', duration: '8', aspect_ratio: '9:16' })

  await falVideo({ apiKey: 'k', modelId: 'fal-ai/kling-video/v3/standard/image-to-video', prompt: 'p', seconds: 5, start: frame, end: frame, client, fetchImpl: fakeDownload })
  const { input } = client.calls[1]
  assert.ok(input.start_image_url instanceof Blob && input.end_image_url instanceof Blob)
  assert.equal(input.start_image_url.type, 'image/jpeg')

  await falVideo({ apiKey: 'k', modelId: 'bytedance/seedance-2.0/image-to-video', prompt: 'p', seconds: 5, start: frame, client, fetchImpl: fakeDownload })
  assert.ok(client.calls[2].input.image_url instanceof Blob)
})

test('magnific maps seedance ratios to its enum and sends frames as base64', async () => {
  const bodies = []
  const fetchImpl = async (url, init = {}) => {
    if (init.method === 'POST') { bodies.push(JSON.parse(init.body)); return { ok: true, status: 200, text: async () => '{"data":{"task_id":"t"}}' } }
    if (url.endsWith('/t')) return { ok: true, status: 200, text: async () => '{"data":{"status":"COMPLETED","generated":["https://v"]}}' }
    return { ok: true, status: 200, arrayBuffer: async () => new Uint8Array([1]).buffer }
  }
  const { magnific } = video()
  await magnificVideo({ apiKey: 'k', modelId: magnific, prompt: 'p', seconds: 8, ratio: '9:16', fetchImpl, pollMs: 0 })
  assert.equal(bodies[0].aspect_ratio, 'social_story_9_16')
  await magnificVideo({ apiKey: 'k', modelId: magnific, prompt: 'p', seconds: 8, start: frame, end: frame, fetchImpl, pollMs: 0 })
  assert.equal(bodies[1].image, 'YWJj')
  assert.equal(bodies[1].image_end, 'YWJj')
  const kling = video({ model: 'kling' }).magnific
  await magnificVideo({ apiKey: 'k', modelId: kling, prompt: 'p', seconds: 8, ratio: '9:16', fetchImpl, pollMs: 0 })
  assert.equal(bodies[2].aspect_ratio, '9:16')
})

test('veo sends the first frame, lastFrame and aspectRatio', async () => {
  let params
  const ai = {
    models: { async generateVideos(p) { params = p; return { done: true, response: { generatedVideos: [{ video: {} }] } } } },
    files: { async download({ downloadPath }) { writeFileSync(downloadPath, 'mp4') } },
  }
  await geminiVideo({ apiKey: 'k', modelId: 'veo', prompt: 'p', seconds: 8, ratio: '9:16', start: frame, end: frame, ai })
  assert.deepEqual(params.image, { imageBytes: 'YWJj', mimeType: 'image/jpeg' })
  assert.deepEqual(params.config, { durationSeconds: 8, aspectRatio: '9:16', lastFrame: { imageBytes: 'YWJj', mimeType: 'image/jpeg' } })
})

test('nano-banana edit sends the source as an inline part', async () => {
  let req
  const ai = { models: { async generateContent(r) { req = r; return { candidates: [{ content: { parts: [{ inlineData: { data: 'AA==' } }] } }] } } } }
  await geminiImage({ apiKey: 'k', modelId: 'm', prompt: 'open it', source: { bytes: Buffer.from('abc'), mimeType: 'image/png' }, ai })
  assert.deepEqual(req.contents, [{ role: 'user', parts: [{ text: 'open it' }, { inlineData: { mimeType: 'image/png', data: 'YWJj' } }] }])
  assert.equal(req.config, undefined)
})

test('gpt-image edit calls images.edit, sizing only when asked', async () => {
  const calls = []
  const client = { images: { async edit(p) { calls.push(p); return { data: [{ b64_json: 'AA==' }] } } } }
  const source = { bytes: Buffer.from('abc'), mimeType: 'image/png' }
  await openaiImage({ apiKey: 'k', modelId: 'gpt-image-2', prompt: 'p', source, client })
  await openaiImage({ apiKey: 'k', modelId: 'gpt-image-2', prompt: 'p', ratio: '9:16', source, client })
  assert.equal(calls[0].model, 'gpt-image-2')
  assert.equal(calls[0].size, undefined)
  assert.equal(calls[1].size, '1024x1536')
  assert.equal(calls[0].image.name, 'source.png')
})
