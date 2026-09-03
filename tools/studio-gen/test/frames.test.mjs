import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { extractFrames } from '../src/frames.mjs'

function hasFfmpeg() {
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true } catch { return false }
}

test('extracts one webp per frame', { skip: hasFfmpeg() ? false : 'ffmpeg not installed' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-gen-'))
  const sample = join(dir, 'sample.mp4')
  // 1s of test pattern at 10fps → 10 source frames.
  execFileSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'testsrc=duration=1:size=64x64:rate=10', sample], { stdio: 'ignore' })

  const framesDir = join(dir, 'frames')
  const n = await extractFrames(sample, framesDir, 10)

  assert.equal(n, 10)
  assert.ok(existsSync(join(framesDir, 'frame-0001.webp')))
  assert.equal(readdirSync(framesDir).filter((f) => f.endsWith('.png')).length, 0)
})
