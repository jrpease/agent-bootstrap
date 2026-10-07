import { test } from 'node:test'
import assert from 'node:assert/strict'
import { magnificVideo } from '../src/adapters/magnific.mjs'
import { pickProvider } from '../src/video.mjs'
import { resolveRequest } from '../src/resolve.mjs'

const json = (body, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) })

function fakeFetch(statuses) {
  const calls = []
  const fn = async (url, init = {}) => {
    calls.push({ url, init })
    if (init.method === 'POST') return json({ data: { task_id: 't1', status: 'CREATED' } })
    if (url.endsWith('/t1')) {
      const status = statuses.shift()
      return json({ data: { task_id: 't1', status, generated: status === 'COMPLETED' ? ['https://cdn/x.mp4'] : [] } })
    }
    return { ok: true, status: 200, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }
  }
  return { fn, calls }
}

test('magnificVideo posts to create, polls the poll path, and downloads the result', async () => {
  const { fn, calls } = fakeFetch(['IN_PROGRESS', 'COMPLETED'])
  const modelId = { create: 'video/kling-v3-std', poll: 'video/kling-v3', durationAs: 'string' }
  const bytes = await magnificVideo({ apiKey: 'k', modelId, prompt: 'p', seconds: 8, fetchImpl: fn, pollMs: 0 })
  assert.deepEqual([...bytes], [1, 2, 3])
  assert.equal(calls[0].url, 'https://api.magnific.com/v1/ai/video/kling-v3-std')
  assert.equal(calls[0].init.headers['x-magnific-api-key'], 'k')
  assert.deepEqual(JSON.parse(calls[0].init.body), { prompt: 'p', duration: '8' })
  assert.equal(calls[1].url, 'https://api.magnific.com/v1/ai/video/kling-v3/t1')
  assert.equal(calls[3].url, 'https://cdn/x.mp4')
})

test('magnificVideo sends seedance duration as a number', async () => {
  const { fn, calls } = fakeFetch(['COMPLETED'])
  const modelId = { create: 'video/seedance-2-pro-1080p', poll: 'video/seedance-2-pro', durationAs: 'number' }
  await magnificVideo({ apiKey: 'k', modelId, prompt: 'p', seconds: 8, fetchImpl: fn, pollMs: 0 })
  assert.deepEqual(JSON.parse(calls[0].init.body), { prompt: 'p', duration: 8 })
})

test('magnificVideo throws on a FAILED task and on an HTTP error', async () => {
  const modelId = { create: 'video/kling-v3-std', poll: 'video/kling-v3', durationAs: 'string' }
  await assert.rejects(magnificVideo({ apiKey: 'k', modelId, prompt: 'p', seconds: 8, fetchImpl: fakeFetch(['FAILED']).fn, pollMs: 0 }), /failed/)
  await assert.rejects(magnificVideo({ apiKey: 'k', modelId, prompt: 'p', seconds: 8, fetchImpl: async () => json({ message: 'bad key' }, 401), pollMs: 0 }), /HTTP 401.*bad key/)
})

const video = (model) => resolveRequest({ command: 'video', prompt: 'x', model, seconds: 8, fps: 30, frames: false })
const keysFor = (have) => (provider) => {
  if (!have.includes(provider)) throw new Error(`no ${provider} key`)
  return { key: `${provider}-key`, notice: provider }
}

test('pickProvider prefers magnific when the account has a magnific key', () => {
  const r = pickProvider(video('seedance'), {}, keysFor(['magnific', 'fal']))
  assert.equal(r.provider, 'magnific')
  assert.equal(r.modelId.create, 'video/seedance-2-pro-1080p')
  assert.equal(r.key, 'magnific-key')
})

test('pickProvider falls back to fal without a magnific key', () => {
  const r = pickProvider(video('kling'), {}, keysFor(['fal']))
  assert.equal(r.provider, 'fal')
  assert.equal(r.modelId, 'fal-ai/kling-video/v3/standard/text-to-video')
})

test('pickProvider names both providers when neither has a key', () => {
  assert.throws(() => pickProvider(video('seedance'), {}, keysFor([])), /no fal key[\s\S]*no magnific key/)
})

test('pickProvider leaves routes without a magnific entry alone', () => {
  assert.equal(pickProvider(video('veo'), {}, keysFor(['magnific', 'gemini'])).provider, 'gemini')
})
