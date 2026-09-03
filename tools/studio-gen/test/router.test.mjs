import { test } from 'node:test'
import assert from 'node:assert/strict'
import { route } from '../src/router.mjs'

test('routes nano-banana to a gemini image model', () => {
  const r = route('nano-banana')
  assert.equal(r.provider, 'gemini')
  assert.equal(r.kind, 'image')
  assert.ok(r.modelId)
})

test('routes seedance to a fal video model', () => {
  const r = route('seedance')
  assert.equal(r.provider, 'fal')
  assert.equal(r.kind, 'video')
})

test('routes gpt-image to openai', () => {
  assert.equal(route('gpt-image').provider, 'openai')
})

test('throws on unknown model, listing known ones', () => {
  assert.throws(() => route('nope'), /Unknown --model "nope".*nano-banana/s)
})
