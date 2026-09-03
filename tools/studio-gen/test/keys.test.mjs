import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveKey, vaultItem, accountEnvVar, sharedEnvVar } from '../src/keys.mjs'

const vault = (map) => ({
  available: () => true,
  loggedIn: () => true,
  show: (item) => (item in map ? map[item] : null),
})
const empty = vault({})

test('derives the vault item path', () => {
  assert.equal(vaultItem('acme', 'gemini'), 'studio-gen/acme-gemini')
})

test('derives the account env var name', () => {
  assert.equal(accountEnvVar('acme', 'gemini'), 'GEMINI_API_KEY_ACME')
  assert.equal(accountEnvVar('acme', 'fal'), 'FAL_KEY_ACME')
  assert.equal(sharedEnvVar('openai'), 'OPENAI_API_KEY')
})

test('step 1: the account env var wins', () => {
  const r = resolveKey('gemini', {
    account: 'acme',
    env: { GEMINI_API_KEY_ACME: 'acct-env', GEMINI_API_KEY: 'shared-env' },
    lpass: vault({ 'studio-gen/acme-gemini': 'acct-vault' }),
  })
  assert.equal(r.key, 'acct-env')
  assert.equal(r.source, 'GEMINI_API_KEY_ACME')
  assert.equal(r.shared, false)
  assert.equal(r.warning, null)
})

test('step 2: the account vault item beats the SHARED env var', () => {
  // The ordering that matters most: GEMINI_API_KEY is exported in every terminal
  // session, so shared-env-first would make acme work grab the personal key.
  const r = resolveKey('gemini', {
    account: 'acme',
    env: { GEMINI_API_KEY: 'shared-env' },
    lpass: vault({ 'studio-gen/acme-gemini': 'acct-vault' }),
  })
  assert.equal(r.key, 'acct-vault')
  assert.equal(r.source, 'lastpass:studio-gen/acme-gemini')
  assert.equal(r.shared, false)
})

test('step 3: falls back to the shared env var, and warns', () => {
  const r = resolveKey('fal', { account: 'work', env: { FAL_KEY: 'shared-env' }, lpass: empty })
  assert.equal(r.key, 'shared-env')
  assert.equal(r.shared, true)
  assert.match(r.warning, /shared/)
  assert.match(r.warning, /work/)
})

test('step 4: falls back to the shared vault item, and warns', () => {
  const r = resolveKey('fal', {
    account: 'work',
    env: {},
    lpass: vault({ 'studio-gen/shared-fal': 'shared-vault' }),
  })
  assert.equal(r.key, 'shared-vault')
  assert.equal(r.source, 'lastpass:studio-gen/shared-fal')
  assert.equal(r.shared, true)
  assert.match(r.warning, /shared/)
  assert.match(r.warning, /work/)
})

test('the notice names the source but never the key', () => {
  const r = resolveKey('gemini', {
    account: 'acme',
    env: {},
    lpass: vault({ 'studio-gen/acme-gemini': 'super-secret-value' }),
  })
  assert.match(r.notice, /account=acme/)
  assert.match(r.notice, /provider=gemini/)
  assert.match(r.notice, /lastpass:studio-gen\/acme-gemini/)
  assert.ok(!r.notice.includes('super-secret-value'))
  assert.ok(!r.source.includes('super-secret-value'))
})

test('the notice carries account provenance (via=) when accountSource is passed', () => {
  // The account is the field that decides who pays. A run resolving from a
  // project pin and a run resolving from a home-pin catch-all must not print
  // identically — regression guard for the account provenance in the notice.
  const r = resolveKey('gemini', {
    account: 'acme',
    accountSource: 'pin:/Users/j/Dev/site/.studio-gen.json',
    env: {},
    lpass: vault({ 'studio-gen/acme-gemini': 'acct-vault' }),
  })
  assert.match(r.notice, /via=pin:\/Users\/j\/Dev\/site\/\.studio-gen\.json/)
})

test('values are trimmed', () => {
  const r = resolveKey('gemini', { account: 'p', env: { GEMINI_API_KEY_P: 'k\n' }, lpass: empty })
  assert.equal(r.key, 'k')
})

test('nothing found: error names both the env var and the vault item', () => {
  assert.throws(
    () => resolveKey('gemini', { account: 'acme', env: {}, lpass: empty }),
    (e) => /GEMINI_API_KEY_ACME/.test(e.message) && /studio-gen\/acme-gemini/.test(e.message),
  )
})

test('lpass not installed: error says how to install it', () => {
  const missing = { available: () => false, loggedIn: () => false, show: () => null }
  assert.throws(
    () => resolveKey('gemini', { account: 'acme', env: {}, lpass: missing }),
    /brew install lastpass-cli/,
  )
})

test('lpass locked: error says to log in, and does not claim the item is missing', () => {
  const locked = { available: () => true, loggedIn: () => false, show: () => null }
  assert.throws(
    () => resolveKey('gemini', { account: 'acme', env: {}, lpass: locked }),
    /lpass login/,
  )
})

test('an env var still resolves when lpass is entirely absent', () => {
  const missing = { available: () => false, loggedIn: () => false, show: () => null }
  const r = resolveKey('gemini', { account: 'acme', env: { GEMINI_API_KEY_ACME: 'k' }, lpass: missing })
  assert.equal(r.key, 'k')
})

test('an unknown provider is rejected', () => {
  assert.throws(() => resolveKey('midjourney', { account: 'p', env: {}, lpass: empty }), /provider/)
})
