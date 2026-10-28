// The request rules every shakedown tester runs under. Pure: no Playwright, safe to require in CI.
//   On a production target, any method but GET/HEAD/OPTIONS is blocked.
//   On a non-production target, writes are allowed; writes to the product's own hosts are logged
//   to <run>/writes.jsonl, which becomes the run's list of what it created.
const fs = require('fs');
const path = require('path');
const os = require('os');

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

function expandHome(p) {
  return p && p.startsWith('~/') ? path.join(os.homedir(), p.slice(2)) : p;
}

// Everything a tester's script needs, from the env vars the lane prompt sets.
function fromEnv(env = process.env) {
  const configPath = env.SHAKEDOWN_CONFIG;
  if (!configPath) throw new Error('SHAKEDOWN_CONFIG is not set (the lane prompt gives its value)');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const target = env.SHAKEDOWN_TARGET;
  if (!config.targets || !config.targets[target]) throw new Error(`SHAKEDOWN_TARGET must be a configured target, got ${target}`);
  if (!env.SHAKEDOWN_RUN) throw new Error('SHAKEDOWN_RUN is not set');
  return { config, target, qa: path.dirname(configPath), runDir: env.SHAKEDOWN_RUN, lane: env.SHAKEDOWN_LANE || 'unknown' };
}

function productHosts(config, target) {
  const t = config.targets[target];
  return [t.app, t.api].filter(Boolean).map((u) => new URL(u).host);
}

// decide({method, url}, ctx) -> {blocked, log}
// Writes are blocked on a production run, and to a production host from any run: a non-production
// tester handed an absolute production URL must not reach it.
function decide({ method, url }, { config, target }) {
  const m = String(method).toUpperCase();
  if (SAFE.has(m)) return { blocked: false, log: false };
  if (target === 'prod') return { blocked: true, log: false };
  let host = null;
  try { host = new URL(url).host; } catch {}
  if (config.targets.prod && productHosts(config, 'prod').includes(host)) return { blocked: true, log: false };
  return { blocked: false, log: productHosts(config, target).includes(host) };
}

function recordWrite(ctx, entry) {
  fs.mkdirSync(ctx.runDir, { recursive: true });
  fs.appendFileSync(path.join(ctx.runDir, 'writes.jsonl'),
    JSON.stringify({ time: new Date().toISOString(), lane: ctx.lane, ...entry }) + '\n');
}

module.exports = { SAFE, decide, recordWrite, fromEnv, productHosts, expandHome };
