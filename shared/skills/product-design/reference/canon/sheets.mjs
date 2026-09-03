// sheets.mjs — build labelled contact sheets from shots.json for ratification.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const DIR = process.argv[2];
const OUT = path.join(DIR, 'sheets');
fs.mkdirSync(OUT, { recursive: true });
const shots = JSON.parse(fs.readFileSync(path.join(DIR, 'shots.json'), 'utf8')).filter(s => s.fold);

const CAT = { studio: 'Studio own sites', saas: 'B2B / SaaS / technology', comm: 'Commerce / DTC / fashion', corp: 'Corporate / institutional', sotd: 'Site of the Day (general)' };
const PER = 9;
const groups = {};
for (const s of shots) (groups[s.cat] ||= []).push(s);

const css = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#111;color:#eee;font:13px/1.4 -apple-system,Segoe UI,sans-serif;padding:28px}
h1{font-size:20px;margin-bottom:4px;font-weight:600}
.sub{color:#888;margin-bottom:22px;font-size:13px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.tile{background:#1b1b1b;border:1px solid #2e2e2e;border-radius:6px;overflow:hidden}
.n{background:#e8523f;color:#fff;font-weight:700;padding:5px 9px;font-size:15px;display:flex;justify-content:space-between;align-items:center}
.n span{font-weight:400;font-size:11px;opacity:.85}
img{width:100%;display:block;background:#000;height:236px;object-fit:cover;object-position:top}
img+img{border-top:2px solid #e8523f}
.meta{padding:7px 9px}
.meta b{display:block;font-size:13px}
.meta code{color:#7fb3ff;font-size:10.5px;word-break:break-all}
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1680, height: 1200 }, deviceScaleFactor: 1 });
let made = [];

for (const [cat, list] of Object.entries(groups)) {
  for (let p = 0; p * PER < list.length; p++) {
    const chunk = list.slice(p * PER, p * PER + PER);
    const tiles = chunk.map(s => `
      <div class="tile">
        <div class="n">#${String(s.i).padStart(2,'0')}<span>${s.kind === 'own' ? 'STUDIO SITE' : 'PROJECT'}</span></div>
        <img src="shots/${s.fold}">
        ${s.mid ? `<img src="shots/${s.mid}">` : ''}
        <div class="meta"><b>${s.studio || '—'}</b><code>${s.url.replace(/^https?:\/\//,'')}</code></div>
      </div>`).join('');
    const total = Math.ceil(list.length / PER);
    const html = `<!doctype html><meta charset=utf-8><style>${css}</style>
      <h1>${CAT[cat] || cat}${total > 1 ? ` — sheet ${p+1}/${total}` : ''}</h1>
      <div class="sub">Top frame = fold. Bottom frame = 45% scroll depth. Call keeps by number.</div>
      <div class="grid">${tiles}</div>`;
    const f = path.join(OUT, `sheet-${cat}${total>1?`-${p+1}`:''}.jpg`);
    const tmp = path.join(DIR, '_sheet.html');
    fs.writeFileSync(tmp, html);
    await page.goto('file://' + tmp, { waitUntil: 'load' });
    await page.waitForTimeout(700);
    await page.screenshot({ path: f, fullPage: true, type: 'jpeg', quality: 82 });
    made.push(f);
    process.stderr.write(`sheet ${path.basename(f)} (${chunk.length})\n`);
  }
}
await browser.close();
process.stderr.write(`\n${made.length} sheets\n`);
