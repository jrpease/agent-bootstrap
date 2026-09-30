// capture.mjs — fold + mid-page still for each candidate, for canon ratification.
import { chromium } from 'playwright-core';
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

// Where real content sits, keyed by its own text so the same elements can be
// diffed after a seek. Used to prove the page moved: the mid frame used to fail
// silently and come back as a second copy of the fold, which is worse than no
// frame, because the contact sheet then shows two identical images and reads as
// a slack page rather than a broken capture.
//
// An earlier version of this compared elementFromPoint at three viewport points
// and was far too sensitive — a ticking ruler animation on an otherwise frozen
// page counted as movement. Measure how far content actually travelled instead.
const contentPositions = page => page.evaluate(() => {
  const out = {};
  let n = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (n >= 60) break;
    const t = (el.textContent || '').trim();
    if (t.length < 4 || t.length > 60) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 4) continue;
    const key = el.tagName + ':' + t.slice(0, 30);
    if (key in out) continue;
    out[key] = Math.round(r.top);
    n++;
  }
  return out;
});

// Median travel of the elements present both before and after. Median, not mean,
// so a couple of pinned or re-flowed items cannot carry the verdict. Measured
// 2026-09-04 and 09-30: a page whose virtual scroll ignored every strategy moved 57px,
// while the least mobile real page (a GitHub PR list) moved 983px. The gap is
// wide enough that half a viewport separates them with room to spare.
function medianTravel(before, after) {
  const d = [];
  for (const k of Object.keys(before)) if (k in after) d.push(Math.abs(before[k] - after[k]));
  if (d.length < 5) return null;   // too few common elements to judge — fail safe
  d.sort((a, b) => a - b);
  return d[d.length >> 1];
}

// The real scroll track. `document.body.scrollHeight` is WRONG on any page with
// a transform-driven scroll: Lenis, Locomotive and GSAP ScrollTrigger pinning
// all leave the body at viewport height while the content runs to thousands of
// pixels. Seeking to 45% of the body height then aims a few hundred pixels down
// and lands back on the fold.
const trackHeight = page => page.evaluate(() => {
  let tallest = 0, container = 0;
  for (const el of document.querySelectorAll('body *')) {
    const h = el.getBoundingClientRect().height;
    if (h > tallest) tallest = h;
    if (el.scrollHeight > el.clientHeight + 100 && el.clientHeight > 300) {
      container = Math.max(container, el.scrollHeight);
    }
  }
  return Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, tallest, container);
});

// Three ways to move a page, tried in order of cost. Some virtual scrollers
// listen only for real wheel events; some expose an instance; most pages just
// scroll. Stops at the first strategy that moves the page: the wheel is
// relative, so running it after a scrollTo that already worked adds a second
// 45% and lands the frame near the footer (measured 2026-09-30: locomotive.ca
// at 86%, a GitHub PR list at its very bottom). Returns the median travel.
async function seek(page, fraction, before) {
  const target = (await trackHeight(page)) * fraction;
  const travel = async () => medianTravel(before, await contentPositions(page));
  let t;

  await page.evaluate(y => window.scrollTo(0, y), target);
  await page.waitForTimeout(400);
  if ((t = await travel()) >= MIN_TRAVEL) return t;

  await page.evaluate(y => {
    const l = window.lenis || window.__lenis || window.locomotiveScroll || window.locoScroll;
    if (l && typeof l.scrollTo === 'function') l.scrollTo(y, { immediate: true, duration: 0 });
  }, target);
  await page.waitForTimeout(400);
  if ((t = await travel()) >= MIN_TRAVEL) return t;

  await page.mouse.move(720, 450);
  for (let sent = 0; sent < target; sent += 500) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(35);
  }
  return travel();
}

const VIEWPORT = { width: 1440, height: 900 };
const MIN_TRAVEL = VIEWPORT.height / 2;   // see medianTravel

const CONC = 4;
const results = [];
let cursor = 0;

async function worker(browser, id) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
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

      const before = await contentPositions(page);
      await seek(page, 0.45, before);
      await page.waitForTimeout(2500);
      const travel = medianTravel(before, await contentPositions(page));
      rec.midTravel = travel;
      // Asked to travel to 45% of the track; anything under half a viewport
      // means it did not go anywhere worth photographing.
      rec.midMoved = travel !== null && travel >= MIN_TRAVEL;

      if (rec.midMoved) {
        rec.mid = `${slug}-mid.jpg`;
        await page.screenshot({ path: path.join(OUT, rec.mid), type: 'jpeg', quality: 72 });
        process.stderr.write(`ok   ${r.cat.padEnd(7)} ${r.url}\n`);
      } else {
        // Deliberately no mid file. A duplicate fold on the contact sheet is a
        // lie the operator has to catch by eye; a missing frame is a question
        // they can answer. Shoot this one by hand before ratifying it.
        process.stderr.write(`NOMID ${r.cat.padEnd(7)} ${r.url} :: virtual scroll — 45% frame not captured\n`);
      }
    } catch (e) {
      rec.err = String(e).split('\n')[0].slice(0, 90);
      process.stderr.write(`FAIL ${r.cat.padEnd(7)} ${r.url} :: ${rec.err}\n`);
    }
    results.push(rec);
    await page.close().catch(() => {});
  }
  await ctx.close();
}

const browser = await chromium.launch({ channel: 'chrome' });   // the installed Chrome — no browser download
await Promise.all(Array.from({ length: CONC }, (_, i) => worker(browser, i)));
await browser.close();
results.sort((a, b) => a.i - b.i);
fs.writeFileSync(path.join(DIR, 'shots.json'), JSON.stringify(results, null, 1));
process.stderr.write(`\ndone: ${results.filter(r => r.fold).length}/${rows.length} captured\n`);
