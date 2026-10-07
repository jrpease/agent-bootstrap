import { execFileSync } from 'node:child_process'

export const PROVIDERS = ['gemini', 'fal', 'openai', 'magnific']

const SHARED_ENV = { gemini: 'GEMINI_API_KEY', fal: 'FAL_KEY', openai: 'OPENAI_API_KEY', magnific: 'MAGNIFIC_API_KEY' }

export function sharedEnvVar(provider) {
  const v = SHARED_ENV[provider]
  if (!v) throw new Error(`unknown provider "${provider}" — expected one of ${PROVIDERS.join(', ')}`)
  return v
}

export function accountEnvVar(account, provider) {
  const suffix = String(account).toUpperCase().replace(/[^A-Z0-9]/g, '_')
  return `${sharedEnvVar(provider)}_${suffix}`
}

export function vaultItem(account, provider) {
  sharedEnvVar(provider) // validates the provider
  return `studio-gen/${account}-${provider}`
}

function run(args) {
  return execFileSync('lpass', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    // Never let a locked vault open a prompt: studio-gen usually runs inside a
    // Claude Code tool call where nobody can type a master password.
    env: { ...process.env, LPASS_DISABLE_PINENTRY: '1' },
  })
}

export const defaultLpass = {
  available() {
    try {
      run(['--version'])
      return true
    } catch {
      return false
    }
  },
  loggedIn() {
    try {
      return /Logged in as/.test(run(['status']))
    } catch {
      return false
    }
  },
  show(item) {
    try {
      const out = run(['show', '--password', item])
      return out && out.trim() ? out : null
    } catch {
      return null
    }
  },
}

export function resolveKey(provider, { account, accountSource, env = process.env, lpass = defaultLpass } = {}) {
  const sharedVar = sharedEnvVar(provider) // throws on unknown provider
  if (!account) throw new Error('resolveKey requires an account — call accountOrThrow() first')

  const acctVar = accountEnvVar(account, provider)
  const acctItem = vaultItem(account, provider)
  const sharedItem = `studio-gen/shared-${provider}`

  const hit = (key, source, shared) => {
    const via = accountSource ? ` via=${accountSource}` : ''
    const notice = `studio-gen: account=${account}${via} provider=${provider} key=${source}`
    const warning = shared
      ? `studio-gen: WARNING using a shared key — "${account}" has no ${provider} key of its own (${source})`
      : null
    return { key: key.trim(), source, account, shared, notice, warning }
  }

  // 1 + 2: account-specific, always ahead of anything shared.
  if (env[acctVar]) return hit(env[acctVar], acctVar, false)
  const acctVault = lpass.show(acctItem)
  if (acctVault) return hit(acctVault, `lastpass:${acctItem}`, false)

  // 3 + 4: shared, and noisy about it.
  if (env[sharedVar]) return hit(env[sharedVar], sharedVar, true)
  const sharedVault = lpass.show(sharedItem)
  if (sharedVault) return hit(sharedVault, `lastpass:${sharedItem}`, true)

  // Nothing. Distinguish the three reasons so the fix is obvious.
  if (!lpass.available()) {
    throw new Error(
      `no ${provider} key for "${account}", and lpass is not installed.\n` +
        `Install it:  brew install lastpass-cli   (or run ./setup.sh deps)\n` +
        `Then:        lpass login <your-email>`,
    )
  }
  if (!lpass.loggedIn()) {
    throw new Error(
      `no ${provider} key for "${account}": the LastPass vault is locked.\n` +
        `Run 'lpass login <your-email>' in a terminal, then retry.`,
    )
  }
  throw new Error(
    `no ${provider} key for account "${account}".\n` +
      `Looked for env ${acctVar}, vault ${acctItem}, env ${sharedVar}, vault ${sharedItem}.\n` +
      `Add the key to LastPass as "${acctItem}" with the key in the password field.`,
  )
}
