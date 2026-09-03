import { test } from 'node:test'
import assert from 'node:assert/strict'
import { geminiImage } from '../src/adapters/gemini.mjs'
import { openaiImage } from '../src/adapters/openai.mjs'

// Both adapters validate before constructing a client, so these never reach the network.

test('gemini rejects an unsupported ratio instead of silently returning 1:1', async () => {
  await assert.rejects(
    () => geminiImage({ apiKey: 'x', modelId: 'm', prompt: 'p', ratio: '5:1' }),
    /gemini does not support --ratio 5:1/,
  )
})

test('openai rejects an unsupported ratio instead of silently returning 16:9', async () => {
  await assert.rejects(
    () => openaiImage({ apiKey: 'x', modelId: 'm', prompt: 'p', ratio: '21:9' }),
    /openai does not support --ratio 21:9/,
  )
})
