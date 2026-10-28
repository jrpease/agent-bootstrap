// Usage: node capture-session.cjs <config.json> <role> [startPath]
// Opens real Chrome on the non-production app, waits for a person to sign in, and saves the
// session to <qa>/auth/<role>.json. The `newuser` role is saved as soon as signup has started,
// so a tester can finish it. Never runs against production.
const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require(path.join(os.homedir(), '.cache/shakedown/node_modules/playwright'));

const [configPath, role, startArg] = process.argv.slice(2);
if (!configPath || !role) { console.error('usage: node capture-session.cjs <config.json> <role> [startPath]'); process.exit(2); }
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const t = config.targets.nonprod;
if (!t || !t.app) { console.error('captures need a non-production app URL (targets.nonprod.app)'); process.exit(2); }
const sessionCookie = config.session && config.session.cookie;
if (!sessionCookie) { console.error('config.session.cookie is required to know when sign-in finished'); process.exit(2); }
const startPath = startArg || (role === 'newuser' ? '/signup' : '/login');
const authDir = path.join(path.dirname(configPath), 'auth');
const out = path.join(authDir, `${role}.json`);
fs.mkdirSync(authDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--disable-blink-features=AutomationControlled']
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await context.newPage();
  await page.goto(new URL(startPath, t.app).toString());
  console.log(`[${role}] sign in in the Chrome window (30 min max)...`);
  const origin = new URL(t.app).origin;
  const deadline = Date.now() + 30 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const cookies = await context.cookies(origin);
    const hasSession = cookies.some((cookie) => cookie.name === sessionCookie);
    const pages = context.pages().filter((p) => p.url().startsWith(origin));
    // Done when signed in and off the sign-in pages; newuser is done once signup is under way.
    const onApp = pages.find((p) => {
      const route = new URL(p.url()).pathname;
      return role === 'newuser' ? /signup|register|onboard/i.test(route) : !/login|signin|sign-in|signup|register|callback/i.test(route);
    });
    if (hasSession && onApp) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await context.storageState({ path: out });
      console.log(`[${role}] SAVED ${out} :: url=${onApp.url()}`);
      await browser.close();
      return;
    }
  }
  console.log(`[${role}] TIMED OUT: nothing saved`);
  await browser.close();
  process.exit(1);
})();
