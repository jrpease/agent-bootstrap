import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse } from '../src/parse.mjs'

test('parses image command with options', () => {
  const p = parse(['image', 'a chair', '--model', 'nano-banana', '--out', 'public/hero', '--ratio', '4:3'])
  assert.equal(p.command, 'image')
  assert.equal(p.prompt, 'a chair')
  assert.equal(p.model, 'nano-banana')
  assert.equal(p.out, 'public/hero')
  assert.equal(p.ratio, '4:3')
})

test('parses video with numeric seconds/fps and boolean frames/dry-run', () => {
  const p = parse(['video', 'x', '--seconds', '8', '--fps', '24', '--frames', '--dry-run'])
  assert.equal(p.seconds, 8)
  assert.equal(p.fps, 24)
  assert.equal(p.frames, true)
  assert.equal(p.dryRun, true)
})

test('applies defaults', () => {
  const p = parse(['image', 'x'])
  assert.equal(p.ratio, undefined)   // resolve.mjs picks the default per command
  assert.equal(p.seconds, 8)
  assert.equal(p.fps, 30)
  assert.equal(p.frames, false)
  assert.equal(p.cutout, false)
  assert.equal(p.dryRun, false)
})

test('parses --cutout', () => {
  const p = parse(['image', 'x', '--cutout'])
  assert.equal(p.cutout, true)
})
