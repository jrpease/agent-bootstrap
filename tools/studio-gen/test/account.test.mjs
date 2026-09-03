import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveAccount, accountOrThrow, PIN_FILE, writePin } from '../src/account.mjs'

// Helper: a fake filesystem of pin files, keyed by directory.
const pins = (map) => (dir) => (dir in map ? map[dir] : null)
const base = { home: '/Users/j', cwd: '/Users/j/Dev/site', readPin: pins({}), inGitRepo: () => false }

test('STUDIO_GEN_ACCOUNT wins over everything', () => {
  const r = resolveAccount({
    ...base,
    env: { STUDIO_GEN_ACCOUNT: 'acme', CLAUDE_CODE_ENTRYPOINT: 'cli', CLAUDE_CONFIG_DIR: '/Users/j/.claude-personal' },
    readPin: pins({ '/Users/j/Dev/site': '{"account":"work"}' }),
  })
  assert.deepEqual(r, { account: 'acme', source: 'STUDIO_GEN_ACCOUNT' })
})

test('finds a pin by walking up from a nested cwd', () => {
  const r = resolveAccount({
    ...base,
    env: {},
    cwd: '/Users/j/Dev/site/public/gen',
    readPin: pins({ '/Users/j/Dev/site': '{"account":"acme"}' }),
  })
  assert.equal(r.account, 'acme')
  assert.equal(r.source, `pin:/Users/j/Dev/site/${PIN_FILE}`)
})

test('the pin outranks the CLAUDE_CONFIG_DIR alias signal', () => {
  const r = resolveAccount({
    ...base,
    env: { CLAUDE_CODE_ENTRYPOINT: 'cli', CLAUDE_CONFIG_DIR: '/Users/j/.claude-personal' },
    readPin: pins({ '/Users/j/Dev/site': '{"account":"acme"}' }),
  })
  assert.equal(r.account, 'acme')
})

test('uses the config dir when the entrypoint is cli', () => {
  const r = resolveAccount({
    ...base,
    env: { CLAUDE_CODE_ENTRYPOINT: 'cli', CLAUDE_CONFIG_DIR: '/Users/j/.claude-acme' },
  })
  assert.deepEqual(r, { account: 'acme', source: 'CLAUDE_CONFIG_DIR' })
})

test('IGNORES the config dir when the entrypoint is the desktop app', () => {
  // Measurement M3: a desktop session reports .claude-personal regardless of the
  // account selected in the app UI. Trusting it there is a silent mis-bill.
  const r = resolveAccount({
    ...base,
    env: { CLAUDE_CODE_ENTRYPOINT: 'claude-desktop', CLAUDE_CONFIG_DIR: '/Users/j/.claude-personal' },
    inGitRepo: () => true,
  })
  assert.deepEqual(r, { account: null, source: 'none' })
})

test('bare ~/.claude yields no account', () => {
  const r = resolveAccount({
    ...base,
    env: { CLAUDE_CODE_ENTRYPOINT: 'cli', CLAUDE_CONFIG_DIR: '/Users/j/.claude' },
    inGitRepo: () => true,
  })
  assert.equal(r.account, null)
})

test('the upward walk does NOT pick up the home pin', () => {
  // Without this exclusion the git gate below is dead code.
  const r = resolveAccount({
    ...base,
    env: {},
    cwd: '/Users/j/Dev/site',
    readPin: pins({ '/Users/j': '{"account":"personal"}' }),
    inGitRepo: () => true,
  })
  assert.equal(r.account, null)
})

test('home pin applies outside a git repo', () => {
  const r = resolveAccount({
    ...base,
    env: {},
    cwd: '/Users/j/Desktop',
    readPin: pins({ '/Users/j': '{"account":"personal"}' }),
    inGitRepo: () => false,
  })
  assert.equal(r.account, 'personal')
  assert.equal(r.source, `home-pin:/Users/j/${PIN_FILE}`)
})

test('home pin is ignored inside a git repo', () => {
  const r = resolveAccount({
    ...base,
    env: {},
    cwd: '/Users/j/Dev/new-client',
    readPin: pins({ '/Users/j': '{"account":"personal"}' }),
    inGitRepo: () => true,
  })
  assert.deepEqual(r, { account: null, source: 'none' })
})

test('the cli alias signal outranks the home pin', () => {
  const r = resolveAccount({
    ...base,
    env: { CLAUDE_CODE_ENTRYPOINT: 'cli', CLAUDE_CONFIG_DIR: '/Users/j/.claude-acme' },
    cwd: '/Users/j/Desktop',
    readPin: pins({ '/Users/j': '{"account":"personal"}' }),
    inGitRepo: () => false,
  })
  assert.equal(r.account, 'acme')
})

test('malformed pin JSON errors naming the file', () => {
  assert.throws(
    () => resolveAccount({ ...base, env: {}, readPin: pins({ '/Users/j/Dev/site': '{not json' }) }),
    /\/Users\/j\/Dev\/site\/\.studio-gen\.json/,
  )
})

test('a pin without an account key errors naming the file', () => {
  assert.throws(
    () => resolveAccount({ ...base, env: {}, readPin: pins({ '/Users/j/Dev/site': '{"acct":"x"}' }) }),
    /\/Users\/j\/Dev\/site\/\.studio-gen\.json.*account/,
  )
})

test('an account slug with illegal characters is rejected', () => {
  assert.throws(
    () => resolveAccount({ ...base, env: { STUDIO_GEN_ACCOUNT: 'in/trivo' } }),
    /slug/,
  )
})

test('slugs are normalised to lowercase and trimmed', () => {
  const r = resolveAccount({ ...base, env: { STUDIO_GEN_ACCOUNT: '  Acme \n' } })
  assert.equal(r.account, 'acme')
})

test('accountOrThrow names both fixes when undetermined', () => {
  assert.throws(
    () => accountOrThrow({ ...base, env: {}, inGitRepo: () => true }),
    (e) => /studio-gen account/.test(e.message) && /STUDIO_GEN_ACCOUNT/.test(e.message),
  )
})

// The tests above all inject inGitRepo, so they never exercise the real
// default. These three drive resolveAccount with no inGitRepo override, so
// the real defaultInGitRepo (git rev-parse --is-inside-work-tree) runs.

test('default inGitRepo: real git repo suppresses the home pin', () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-gen-git-'))
  try {
    execFileSync('git', ['init', '-q'], { cwd: dir })
    const r = resolveAccount({
      env: {},
      cwd: dir,
      home: dir,
      readPin: pins({ [dir]: '{"account":"personal"}' }),
    })
    assert.deepEqual(r, { account: null, source: 'none' })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('default inGitRepo: real non-repo directory lets the home pin apply', () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-gen-nogit-'))
  try {
    const r = resolveAccount({
      env: {},
      cwd: dir,
      home: dir,
      readPin: pins({ [dir]: '{"account":"personal"}' }),
    })
    assert.equal(r.account, 'personal')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('default inGitRepo: unrunnable git suppresses the home pin', () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-gen-noexe-'))
  const originalPath = process.env.PATH
  try {
    process.env.PATH = ''
    const r = resolveAccount({
      env: {},
      cwd: dir,
      home: dir,
      readPin: pins({ [dir]: '{"account":"personal"}' }),
    })
    assert.deepEqual(r, { account: null, source: 'none' })
  } finally {
    process.env.PATH = originalPath
    rmSync(dir, { recursive: true, force: true })
  }
})

test('default readPin: a missing pin returns null and the walk continues upward', () => {
  const home = mkdtempSync(join(tmpdir(), 'studio-gen-pin-missing-'))
  const mid = join(home, 'mid')
  const leaf = join(mid, 'leaf')
  try {
    mkdirSync(leaf, { recursive: true })
    writeFileSync(join(mid, PIN_FILE), '{"account":"acme"}\n')
    const r = resolveAccount({ env: {}, cwd: leaf, home, inGitRepo: () => true })
    assert.equal(r.account, 'acme')
    assert.equal(r.source, `pin:${join(mid, PIN_FILE)}`)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('default readPin: an unreadable pin throws rather than being treated as absent', (t) => {
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    t.skip('running as root: chmod 000 does not prevent root from reading')
    return
  }
  const dir = mkdtempSync(join(tmpdir(), 'studio-gen-pin-unreadable-'))
  const pinPath = join(dir, PIN_FILE)
  writeFileSync(pinPath, '{"account":"acme"}\n')
  try {
    chmodSync(pinPath, 0o000)
    assert.throws(() => resolveAccount({ env: {}, cwd: dir, home: tmpdir(), inGitRepo: () => true }))
  } finally {
    chmodSync(pinPath, 0o600)
    rmSync(dir, { recursive: true, force: true })
  }
})

test('writePin writes a pin the resolver can read back', () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-gen-pin-'))
  try {
    const path = writePin(dir, 'Acme')
    assert.equal(path, join(dir, PIN_FILE))
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), { account: 'acme' })

    const r = resolveAccount({ env: {}, cwd: dir, home: tmpdir(), inGitRepo: () => true })
    assert.equal(r.account, 'acme')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
