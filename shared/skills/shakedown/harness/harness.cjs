// Shakedown browser harness. Usage in a tester's script (.cjs, run with node and the SHAKEDOWN_* env vars):
//   const { open, PROFILES } = require('<harness>/harness.cjs');
//   const session = await open({ profile: 'iphone-safari', role: 'member', tag: 'lb-mobile' });
//   try { await session.page.goto('/items'); await session.shot('items'); }
//   finally { const report = await session.close(); }
//   close() saves the refreshed session, releases the role lock, and returns
//   { consoleErrors, pageErrors, failedRequests, slowRequests, blockedRequests, shots, sessionWarning }.
// On a production target, open() refuses any role and every data-changing request is blocked.
const path = require('path');
const fs = require('fs');
const os = require('os');
const policy = require('./policy.cjs');
const pw = require(path.join(os.homedir(), '.cache/shakedown/node_modules/playwright'));

// Coverage matrix: names usable as `profile` and in a config's `devices`.
const PROFILES = {
  'desktop-chrome': { browser: 'chromium', device: 'Desktop Chrome', viewport: { width: 1440, height: 900 } },
  'desktop-safari': { browser: 'webkit', device: 'Desktop Safari', viewport: { width: 1440, height: 900 } },
  'desktop-firefox': { browser: 'firefox', device: 'Desktop Firefox', viewport: { width: 1366, height: 768 } },
  'desktop-edge-small': { browser: 'chromium', device: 'Desktop Edge', viewport: { width: 1280, height: 720 } },
  'ipad-safari': { browser: 'webkit', device: 'iPad (gen 7)' },
  'ipad-landscape': { browser: 'webkit', device: 'iPad (gen 7) landscape' },
  'android-tablet': { browser: 'chromium', device: 'Galaxy Tab S4' },
  'iphone-safari': { browser: 'webkit', device: 'iPhone 15' },
  'iphone-se': { browser: 'webkit', device: 'iPhone SE' },
  'android-chrome': { browser: 'chromium', device: 'Pixel 7' },
  'samsung-dark': { browser: 'chromium', device: 'Galaxy S9+', colorScheme: 'dark' }
};

// Cookies worth saving: the app's own registrable domain (last two labels of its host).
function ownCookie(appHost) {
  const site = appHost.split('.').slice(-2).join('.');
  return (cookie) => { const d = cookie.domain.replace(/^\./, ''); return d === site || d.endsWith(`.${site}`); };
}

async function open({ profile = 'desktop-chrome', role = null, tag = 'run', colorScheme, locale } = {}, ctx = policy.fromEnv()) {
  const spec = PROFILES[profile];
  if (!spec) throw new Error(`unknown profile ${profile}; one of ${Object.keys(PROFILES).join(', ')}`);
  if (role && ctx.target === 'prod') throw new Error('production runs are logged out: no role may be opened');
  const { config, target, qa, runDir } = ctx;
  const t = config.targets[target];
  if (!t.app) throw new Error('this target has no app URL; use api.cjs');
  const appHost = new URL(t.app).hostname;
  const hosts = policy.productHosts(config, target);
  const sessionCookie = config.session && config.session.cookie;
  const authPath = config.session && config.session.authPath;
  const scroller = config.scrollContainer || null;

  const browser = await pw[spec.browser].launch({ headless: true });
  const deviceOpts = { ...pw.devices[spec.device] };
  if (spec.browser === 'firefox') delete deviceOpts.isMobile;
  const authFile = role ? path.join(qa, 'auth', `${role}.json`) : null;
  if (authFile && !fs.existsSync(authFile)) { await browser.close(); throw new Error(`no saved session for role ${role}`); }
  // Sessions may rotate on every load: one live session per role, and the newest state is written
  // back on close. The lock is a directory (atomic mkdir); stale after 15 minutes.
  const lockDir = authFile ? authFile.replace(/\.json$/, '.lock') : null;
  if (lockDir) {
    const waitUntil = Date.now() + 20 * 60 * 1000;
    for (;;) {
      try { fs.mkdirSync(lockDir); fs.writeFileSync(path.join(lockDir, 'owner'), `${tag} ${new Date().toISOString()}`); break; }
      catch {
        try { if (Date.now() - fs.statSync(lockDir).mtimeMs > 15 * 60 * 1000) { fs.rmSync(lockDir, { recursive: true, force: true }); continue; } } catch {}
        if (Date.now() > waitUntil) { await browser.close(); throw new Error(`timed out waiting for ${role} session lock`); }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }
  const context = await browser.newContext({
    ...deviceOpts,
    ...(spec.viewport ? { viewport: spec.viewport } : {}),
    baseURL: t.app,
    colorScheme: colorScheme || spec.colorScheme || 'light',
    serviceWorkers: 'block', // service-worker fetches would skip the request block below
    ...(locale ? { locale } : {}),
    ...(authFile ? { storageState: authFile } : {})
  });
  const consoleErrors = [], pageErrors = [], failedRequests = [], slowRequests = [], blockedRequests = [], shots = [];
  // The production block: every request passes through policy.decide before it leaves the browser.
  // A tester's own page.route runs first; requests it fulfills or aborts never reach here, so only
  // requests seen here went to the network and count as writes.
  const sent = new WeakSet();
  await context.route('**/*', (route) => {
    const req = route.request();
    if (policy.decide({ method: req.method(), url: req.url() }, ctx).blocked) {
      blockedRequests.push(`BLOCKED ${req.method()} ${req.url()}`);
      return route.abort('blockedbyclient');
    }
    sent.add(req);
    return route.continue();
  });
  // On production no tester-side interception: a page.route handler runs before the block above and
  // could send a write straight to the network, and unroute would remove the block itself.
  const refuse = async () => { throw new Error('request interception is disabled on production'); };
  const lock = (o) => { for (const m of ['route', 'unroute', 'unrouteAll', 'routeFromHAR', 'routeWebSocket']) o[m] = refuse; return o; };
  if (target === 'prod') {
    lock(context);
    const newPage = context.newPage.bind(context);
    context.newPage = async () => lock(await newPage());
  }
  const page = await context.newPage();
  const started = new Map();
  const logged = new WeakSet(); // a request can fire response and requestfailed both; log it once
  const responded = new WeakSet();
  const isOwn = (u) => { try { return hosts.includes(new URL(u).host); } catch { return false; } };
  page.on('console', (msg) => { if (['error', 'warning'].includes(msg.type())) consoleErrors.push(`[${msg.type()}] ${msg.text().slice(0, 400)} @ ${page.url()}`); });
  page.on('pageerror', (err) => pageErrors.push(`${err.message.slice(0, 400)} @ ${page.url()}`));
  page.on('request', (req) => started.set(req, Date.now()));
  page.on('requestfailed', (req) => {
    const err = req.failure() && req.failure().errorText;
    if (/blocked_?by_?client/i.test(err || '') || responded.has(req)) return;
    failedRequests.push(`FAILED ${req.method()} ${req.url()} :: ${err}`);
    if (sent.has(req) && !logged.has(req) && policy.decide({ method: req.method(), url: req.url() }, ctx).log) { logged.add(req); policy.recordWrite(ctx, { role: role || 'anon', method: req.method(), url: req.url(), status: 'failed' }); }
  });
  page.on('response', (res) => {
    const req = res.request();
    responded.add(req);
    const ms = Date.now() - (started.get(req) || Date.now());
    if (res.status() >= 400) failedRequests.push(`${res.status()} ${req.method()} ${res.url()} (page ${page.url()})`);
    if (ms > 3000 && isOwn(res.url())) slowRequests.push(`${ms}ms ${req.method()} ${res.url()}`);
    if (sent.has(req) && !logged.has(req) && policy.decide({ method: req.method(), url: req.url() }, ctx).log) { logged.add(req); policy.recordWrite(ctx, { role: role || 'anon', method: req.method(), url: req.url(), status: res.status() }); }
    if (authFile && authPath && isOwn(res.url()) && res.url().includes(authPath) && res.ok()) setTimeout(persist, 500);
  });
  const evidenceDir = path.join(runDir, 'evidence', ctx.lane, tag);
  fs.mkdirSync(evidenceDir, { recursive: true });
  const shot = async (name, opts = {}) => {
    const file = path.join(evidenceDir, `${profile}-${role || 'anon'}-${name}.png`);
    if (opts.fullPage && scroller) {
      await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) { el.style.height = 'auto'; el.style.overflow = 'visible'; } }, scroller).catch(() => {});
    }
    await page.screenshot({ path: file, fullPage: !!opts.fullPage }).catch((err) => console.log('shot failed', err.message));
    if (opts.fullPage && scroller) await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) { el.style.height = ''; el.style.overflow = ''; } }, scroller).catch(() => {});
    shots.push(file);
    return file;
  };
  // Horizontal overflow: the most common phone layout bug.
  const overflow = () => page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    return [...document.querySelectorAll('body *')].filter((el) => { const r = el.getBoundingClientRect(); return r.right > vw + 2 && r.width > 0 && getComputedStyle(el).position !== 'fixed'; }).slice(0, 8).map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 3).join('.')} right=${Math.round(el.getBoundingClientRect().right)} vw=${vw}`);
  });
  const scrollApp = (y) => page.evaluate(([sel, top]) => (sel ? document.querySelector(sel) : window)?.scrollTo({ top }), [scroller, y]);
  const keep = ownCookie(appHost);
  let sessionWarning = null;
  // Save the refreshed session as soon as the app issues it, so a crashed script can't strand the role.
  async function persist() {
    try {
      const state = await context.storageState();
      state.cookies = state.cookies.filter(keep);
      if (!sessionCookie || state.cookies.some((c) => c.name === sessionCookie)) { fs.writeFileSync(`${authFile}.tmp`, JSON.stringify(state)); fs.renameSync(`${authFile}.tmp`, authFile); }
    } catch {}
  }
  const close = async () => {
    if (authFile) {
      try {
        const state = await context.storageState();
        state.cookies = state.cookies.filter(keep);
        if (!sessionCookie || state.cookies.some((c) => c.name === sessionCookie)) { fs.writeFileSync(`${authFile}.tmp`, JSON.stringify(state)); fs.renameSync(`${authFile}.tmp`, authFile); }
        else sessionWarning = `SESSION LOST for role ${role}: no ${sessionCookie} cookie after this run — the account is now logged out; stop logged-in testing for this role and report it`;
      } catch (err) { sessionWarning = `could not save session: ${err.message}`; }
    }
    await context.close(); await browser.close();
    if (lockDir) fs.rmSync(lockDir, { recursive: true, force: true });
    if (sessionWarning) console.log(sessionWarning);
    return { profile, role, sessionWarning, consoleErrors, pageErrors, failedRequests, slowRequests, blockedRequests, shots };
  };
  // `browser` stays private: a second context from it would have no request block.
  return { page, context, shot, overflow, scrollApp, close, evidenceDir };
}

module.exports = { open, PROFILES };
