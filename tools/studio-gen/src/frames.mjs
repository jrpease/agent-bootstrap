import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

// Extract a numbered WebP frame sequence from a video. ffmpeg writes PNG (its
// png encoder ships with every build; the webp encoder does not), then sharp
// converts each frame to WebP. Returns the WebP frame count.
export async function extractFrames(videoPath, outDir, fps = 30) {
  mkdirSync(outDir, { recursive: true })
  execFileSync('ffmpeg', ['-y', '-i', videoPath, '-vf', `fps=${fps}`, join(outDir, 'frame-%04d.png')], { stdio: 'ignore' })
  const pngs = readdirSync(outDir).filter((f) => f.endsWith('.png')).sort()
  for (const png of pngs) {
    const src = join(outDir, png)
    await sharp(src).webp({ quality: 90 }).toFile(src.replace(/\.png$/, '.webp'))
    rmSync(src)
  }
  return readdirSync(outDir).filter((f) => f.endsWith('.webp')).length
}
