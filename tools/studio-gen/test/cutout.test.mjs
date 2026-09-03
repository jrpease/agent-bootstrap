import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openaiImage } from '../src/adapters/openai.mjs'

// A fake client (injected via the `client` param) stands in for the OpenAI SDK so
// these assert on the request shape without ever hitting the network.
function fakeClient(capture) {
  return {
    images: {
      async generate(params) {
        capture.params = params
        return { data: [{ b64_json: Buffer.from('fake-png').toString('base64') }] }
      },
    },
  }
}

test('cutout forces the transparent-capable model regardless of the routed modelId', async () => {
  const capture = {}
  await openaiImage({ modelId: 'gpt-image-2', prompt: 'p', ratio: '1:1', cutout: true, client: fakeClient(capture) })
  assert.equal(capture.params.model, 'gpt-image-1.5')
})

test('cutout requests a transparent background as png', async () => {
  const capture = {}
  await openaiImage({ modelId: 'gpt-image-2', prompt: 'p', ratio: '1:1', cutout: true, client: fakeClient(capture) })
  assert.equal(capture.params.background, 'transparent')
  assert.equal(capture.params.output_format, 'png')
})

test('without cutout, the routed modelId is used and no background/output_format is sent', async () => {
  const capture = {}
  await openaiImage({ modelId: 'gpt-image-2', prompt: 'p', ratio: '1:1', cutout: false, client: fakeClient(capture) })
  assert.equal(capture.params.model, 'gpt-image-2')
  assert.equal(capture.params.background, undefined)
  assert.equal(capture.params.output_format, undefined)
})
