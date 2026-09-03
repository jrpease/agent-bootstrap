import { readFileSync } from 'node:fs'
import { parse } from './parse.mjs'
import { resolveRequest, formatRequest } from './resolve.mjs'
import { resolveAccount, writePin, PIN_FILE } from './account.mjs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)))

export async function main(argv) {
  const parsed = parse(argv)
  if (parsed.version) {
    console.log(pkg.version)
    return
  }

  // `account` is handled before resolveRequest, which only accepts image/video.
  // It must never need a key, so it works before the vault is set up.
  if (parsed.command === 'account') {
    if (parsed.prompt) {
      console.log(`pinned ${writePin(process.cwd(), parsed.prompt)}`)
      return
    }
    const { account, source } = resolveAccount()
    console.log(account ? `${account}  (from ${source})` : `no account resolved — pin one with: studio-gen account <name>  (writes ./${PIN_FILE})`)
    return
  }

  const req = resolveRequest(parsed)
  if (parsed.dryRun) {
    console.log(formatRequest(req))
    return
  }
  const { runImage } = await import('./image.mjs')
  const { runVideo } = await import('./video.mjs')
  const out = req.command === 'image' ? await runImage(req) : await runVideo(req)
  console.log(out)
}
