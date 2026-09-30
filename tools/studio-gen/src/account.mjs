import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve as resolvePath } from 'node:path'
import { homedir } from 'node:os'

export const PIN_FILE = '.studio-gen.json'

const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/

function normalise(raw, where) {
  const slug = String(raw).trim().toLowerCase()
  if (!SLUG_RE.test(slug)) {
    throw new Error(`invalid account slug "${raw}" from ${where} — expected a lowercase slug like "acme"`)
  }
  return slug
}

// Only ENOENT (no file) and ENOTDIR (a path component is a file, so there's no
// directory to look in) mean "no pin here" — the walk should continue past
// those. Every other error (EACCES, EPERM — macOS TCC can raise this under
// ~/Desktop or ~/Documents —, EIO, a dangling symlink, ...) means we could not
// tell whether a pin exists, and must propagate loudly rather than be treated
// as "no pin", which would silently walk past an account declaration. Same
// defect class, and same fix, as defaultInGitRepo below.
function defaultReadPin(dir) {
  try {
    return readFileSync(join(dir, PIN_FILE), 'utf8')
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return null
    throw err
  }
}

// git's own answer, so behaviour matches the user's mental model. The catch
// covers two very different cases and they must not be conflated:
//   - git RAN and answered "no" (a non-zero exit, e.g. status 128 outside a
//     work tree) — a genuine non-repo, carried as a numeric `.status` on the
//     thrown error. We return false, so the home pin applies as normal.
//   - git could NOT be run at all (e.g. ENOENT — no git on PATH — or another
//     spawn failure) — `.status` is not a number. We can't tell where we are,
//     so we return true, the SAFE direction: it suppresses the home pin and
//     forces an explicit account rather than guessing one.
function defaultInGitRepo(cwd) {
  try {
    const out = execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return out.trim() === 'true'
  } catch (err) {
    return typeof err.status !== 'number'
  }
}

function accountFromPin(raw, path) {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`${path} is not valid JSON — expected {"account": "acme"}`)
  }
  if (!parsed || typeof parsed.account !== 'string' || !parsed.account.trim()) {
    throw new Error(`${path} has no "account" string — expected {"account": "acme"}`)
  }
  return normalise(parsed.account, path)
}

export function resolveAccount({
  env = process.env,
  cwd = process.cwd(),
  home = homedir(),
  readPin = defaultReadPin,
  inGitRepo = defaultInGitRepo,
} = {}) {
  // 1. explicit one-off override
  if (env.STUDIO_GEN_ACCOUNT && env.STUDIO_GEN_ACCOUNT.trim()) {
    return { account: normalise(env.STUDIO_GEN_ACCOUNT, 'STUDIO_GEN_ACCOUNT'), source: 'STUDIO_GEN_ACCOUNT' }
  }

  // 2. nearest project pin, walking up from cwd. Stops BEFORE $HOME — otherwise
  //    the home pin would be found here and the git gate in step 4 is dead code.
  let dir = resolvePath(cwd)
  const stop = resolvePath(home)
  for (;;) {
    if (dir === stop) break
    const raw = readPin(dir)
    if (raw != null) {
      const path = join(dir, PIN_FILE)
      return { account: accountFromPin(raw, path), source: `pin:${path}` }
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  // 3. the claude-<name> alias, trusted ONLY in terminal sessions. Measurement M3:
  //    desktop sessions report .claude-personal whatever the app UI shows.
  if (env.CLAUDE_CODE_ENTRYPOINT === 'cli' && env.CLAUDE_CONFIG_DIR) {
    const m = /^\.claude-(.+)$/.exec(basename(env.CLAUDE_CONFIG_DIR))
    if (m) return { account: normalise(m[1], 'CLAUDE_CONFIG_DIR'), source: 'CLAUDE_CONFIG_DIR' }
  }

  // 4. home pin, for loose work only. Inside a repo we'd rather error than guess.
  if (!inGitRepo(cwd)) {
    const raw = readPin(stop)
    if (raw != null) {
      const path = join(stop, PIN_FILE)
      return { account: accountFromPin(raw, path), source: `home-pin:${path}` }
    }
  }

  return { account: null, source: 'none' }
}

export function accountOrThrow(opts = {}) {
  const { account, source } = resolveAccount(opts)
  if (account) return { account, source }
  throw new Error(
    [
      'no account could be determined, so no key was chosen.',
      `Pin this project:  studio-gen account <name>   (writes ./${PIN_FILE})`,
      'Or for one command: STUDIO_GEN_ACCOUNT=<name> studio-gen …',
      'Accounts are the names of your claude-<name> aliases, e.g. personal, work, acme.',
    ].join('\n'),
  )
}

export function writePin(dir, account) {
  const slug = normalise(account, 'argument')
  const path = join(resolvePath(dir), PIN_FILE)
  writeFileSync(path, `${JSON.stringify({ account: slug }, null, 2)}\n`)
  return path
}
