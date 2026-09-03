import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveRequest, formatRequest, defaultOut } from '../src/resolve.mjs'

test('defaults model per command', () => {
  assert.equal(resolveRequest({ command: 'image', prompt: 'x', ratio: '16:9' }).model, 'nano-banana')
  assert.equal(resolveRequest({ command: 'video', prompt: 'x', seconds: 8, fps: 30, frames: false }).model, 'seedance')
})

test('resolves provider + modelId from the model', () => {
  const r = resolveRequest({ command: 'image', prompt: 'x', model: 'gpt-image', ratio: '16:9' })
  assert.equal(r.provider, 'openai')
  assert.equal(r.modelId, 'gpt-image-2')
})

test('rejects a video model used for image', () => {
  assert.throws(() => resolveRequest({ command: 'image', prompt: 'x', model: 'veo', ratio: '16:9' }), /is a video model/)
})

test('rejects missing prompt and bad command', () => {
  assert.throws(() => resolveRequest({ command: 'image' }), /prompt is required/)
  assert.throws(() => resolveRequest({ command: 'nope', prompt: 'x' }), /must be "image" or "video"/)
})

test('derives a slug out dir when --out omitted', () => {
  assert.equal(defaultOut('image', 'Brushed Titanium!!'), 'public/gen/brushed-titanium')
  assert.equal(defaultOut('video', 'iPhone deconstruct'), 'public/seq/iphone-deconstruct')
})

test('formatRequest shows provider and modelId', () => {
  const out = formatRequest(resolveRequest({ command: 'image', prompt: 'x', model: 'nano-banana', ratio: '16:9' }))
  assert.match(out, /gemini/)
  assert.match(out, /gemini-3-pro-image/)
})

test('rejects non-numeric --seconds/--fps for video', () => {
  assert.throws(() => resolveRequest({ command: 'video', prompt: 'x', seconds: NaN, fps: 30, frames: false }), /--seconds must be a number/)
  assert.throws(() => resolveRequest({ command: 'video', prompt: 'x', seconds: 8, fps: NaN, frames: false }), /--fps must be a number/)
})

test('falls back to asset slug when the prompt has no alphanumerics', () => {
  assert.equal(defaultOut('image', '!!!???'), 'public/gen/asset')
})

test('threads --cutout into image params for an openai model', () => {
  const r = resolveRequest({ command: 'image', prompt: 'x', model: 'gpt-image', ratio: '16:9', cutout: true })
  assert.equal(r.params.cutout, true)
})

test('rejects --cutout on a non-openai model', () => {
  assert.throws(
    () => resolveRequest({ command: 'image', prompt: 'x', model: 'nano-banana', ratio: '16:9', cutout: true }),
    /--cutout requires an openai model/,
  )
})
