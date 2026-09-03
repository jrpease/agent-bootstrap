// capture.mjs — fold + mid-page still for each candidate, for canon ratification.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const DIR = process.argv[2];
const OUT = path.join(DIR, 'shots');
fs.mkdirSync(OUT, { recursive: true });

const rows = fs.readFileSync(path.join(DIR, 'live.tsv'), 'utf8')
  .trim().split('\n').map(l => l.split('\t'))
  .filter(r => r[0].startsWith('2'))
  .map(([code, cat, kind, studio, url], i) => ({ i, cat, kind, studio, url }));

// Common consent-management platforms + generic accept buttons.
const CMP_SELECTORS = [
  '#onetrust-accept-btn-handler',
  '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  '#CybotCookiebotDialogBodyButtonAccept',
  'button[mode="primary"][aria-label*="ccept" i]',
  '.cc-allow', '.cky-btn-accept', '#hs-eu-confirmation-button',
  '[data-testid="uc-accept-all-button"]', '#didomi-notice-agree-button',
  '[id*="accept-all" i]', '[class*="accept-all" i]',
];
const ACCEPT_TEXT = /^(accept( all)?( cookies)?|allow all|i agree|agree|got it|ok(ay)?|tout accepter|accetta( tutti)?|aceptar|alle akzeptieren|zustimmen)$/i;

async function dismissConsent(page) {
  for (const sel of CMP_SELECTORS) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 250 })) { await el.click({ timeout: 1500 }); await page.waitForTimeout(500); return; }
    } catch {}
  }
  try {
    const btns = await page.locator('button, a[role="button"], [class*="btn" i]').all();
    for (const b of btns.slice(0, 60)) {
      const t = ((await b.innerText().catch(() => '')) || '').trim();
      if (t && t.length < 30 && ACCEPT_TEXT.test(t)) {
        if (await b.isVisible().catch(() => false)) { await b.click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(500); return; }
      }
    }
  } catch {}
}

const CONC = 4;
const results = [];
let cursor = 0;

async function worker(browser, id) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  });
  while (true) {
    const n = cursor++;
    if (n >= rows.length) break;
    const r = rows[n];
    const slug = String(r.i).padStart(2, '0') + '-' + r.cat + '-' +
      r.url.replace(/^https?:\/\/(www\.)?/, '').replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
    const page = await ctx.newPage();
    const rec = { ...r, slug, fold: null, mid: null, err: null };
    try {
      await page.goto(r.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(3000);
      await dismissConsent(page);                            // cookie walls hide the design
      await page.waitForTimeout(4500);                       // let loaders/entrances finish
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(600);
      rec.fold = `${slug}-fold.jpg`;
      await page.screenshot({ path: path.join(OUT, rec.fold), type: 'jpeg', quality: 72 });
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.45));
      await page.waitForTimeout(2500);
      rec.mid = `${slug}-mid.jpg`;
      await page.screenshot({ path: path.join(OUT, rec.mid), type: 'jpeg', quality: 72 });
      process.stderr.write(`ok   ${r.cat.padEnd(7)} ${r.url}\n`);
    } catch (e) {
      rec.err = String(e).split('\n')[0].slice(0, 90);
      process.stderr.write(`FAIL ${r.cat.padEnd(7)} ${r.url} :: ${rec.err}\n`);
    }
    results.push(rec);
    await page.close().catch(() => {});
  }
  await ctx.close();
}

const browser = await chromium.launch();
await Promise.all(Array.from({ length: CONC }, (_, i) => worker(browser, i)));
await browser.close();
results.sort((a, b) => a.i - b.i);
fs.writeFileSync(path.join(DIR, 'shots.json'), JSON.stringify(results, null, 1));
process.stderr.write(`\ndone: ${results.filter(r => r.fold).length}/${rows.length} captured\n`);
