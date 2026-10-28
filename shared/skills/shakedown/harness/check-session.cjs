// Usage: node check-session.cjs <config.json> <run-dir> <role|--api-token> [path]
// Prints "VALID <role>" or "EXPIRED <role>: <why>" and exits 0 or 1.
//   <role>       opens the saved session on one profile and checks the session cookie survives a load.
//   --api-token  for API-only products: the token env var is set and one authenticated GET isn't 401/403.
// Always runs against the non-production target; production runs use no sessions.
const policy = require('./policy.cjs');

const [configPath, runDir, who, probePath] = process.argv.slice(2);
if (!configPath || !runDir || !who) { console.error('usage: node check-session.cjs <config.json> <run-dir> <role|--api-token> [path]'); process.exit(2); }
const ctx = policy.fromEnv({ SHAKEDOWN_CONFIG: configPath, SHAKEDOWN_TARGET: 'nonprod', SHAKEDOWN_RUN: runDir, SHAKEDOWN_LANE: 'session-check' });

async function checkToken() {
  const name = ctx.config.api && ctx.config.api.tokenEnv;
  if (!name || !process.env[name]) return `EXPIRED api-token: ${name || 'api.tokenEnv'} is not set`;
  const api = require('./api.cjs').client(ctx);
  const res = await api.get(probePath || '/', { auth: true });
  return res.status === 401 || res.status === 403 ? `EXPIRED api-token: ${res.status} on ${probePath || '/'}` : 'VALID api-token';
}

async function checkRole(role) {
  const { open } = require('./harness.cjs');
  const s = await open({ profile: 'desktop-chrome', role, tag: 'session-check' }, ctx);
  try {
    await s.page.goto(probePath || '/', { waitUntil: 'networkidle', timeout: 45000 });
    await s.page.waitForTimeout(2500);
  } finally {
    const r = await s.close();
    if (r.sessionWarning) return `EXPIRED ${role}: ${r.sessionWarning}`;
  }
  return `VALID ${role}`;
}

(async () => {
  const line = who === '--api-token' ? await checkToken() : await checkRole(who);
  console.log(line);
  process.exit(line.startsWith('VALID') ? 0 : 1);
})().catch((err) => { console.log(`EXPIRED ${who}: ${err.message}`); process.exit(1); });
