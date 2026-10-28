// API client for shakedown testers. Use it for every API call instead of curl or raw fetch.
//   const api = require('<harness>/api.cjs').client();          // reads SHAKEDOWN_* env vars
//   const res = await api.get('/v1/items?page=2');                // relative to the target's API URL
//   await api.post('/v1/items', { name: 'QA1028 lane thing' });   // blocked on production
//   await api.raw('https://app.example/robots.txt');               // GET any absolute URL
// Each call returns { status, ms, headers, body } (body parsed as JSON when it is JSON).
// With { auth: true } it sends the API token from config.api.tokenEnv; never on production.
const policy = require('./policy.cjs');

function client(ctx = policy.fromEnv(), fetchImpl = globalThis.fetch) {
  const t = ctx.config.targets[ctx.target];
  const base = t.api || t.app;
  const blocked = [];

  function token() {
    if (ctx.target === 'prod') return null; // production runs never load credentials
    const name = ctx.config.api && ctx.config.api.tokenEnv;
    return name ? process.env[name] || null : null;
  }

  async function request(method, url, body, opts = {}) {
    const full = new URL(url, base).toString();
    const verdict = policy.decide({ method, url: full }, ctx);
    if (verdict.blocked) {
      blocked.push(`${method} ${full}`);
      throw new Error(`BLOCKED: ${method} ${full} — production allows read-only requests only`);
    }
    const headers = { accept: 'application/json', ...(opts.headers || {}) };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (opts.auth) {
      const tok = token();
      if (!tok) throw new Error(ctx.target === 'prod' ? 'no credentials on production' : 'API token env var is not set');
      headers.authorization = `Bearer ${tok}`;
    }
    const started = Date.now();
    const res = await fetchImpl(full, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const ms = Date.now() - started;
    const text = await res.text();
    let parsed = text;
    try { parsed = JSON.parse(text); } catch {}
    if (verdict.log) policy.recordWrite(ctx, { role: opts.role || (opts.auth ? 'api-token' : 'anon'), method, url: full, status: res.status });
    return { status: res.status, ms, headers: Object.fromEntries(res.headers), body: parsed };
  }

  return {
    get: (url, opts) => request('GET', url, undefined, opts),
    post: (url, body, opts) => request('POST', url, body, opts),
    put: (url, body, opts) => request('PUT', url, body, opts),
    patch: (url, body, opts) => request('PATCH', url, body, opts),
    delete: (url, opts) => request('DELETE', url, undefined, opts),
    raw: (url, opts) => request('GET', url, undefined, opts),
    blocked,
  };
}

module.exports = { client };
