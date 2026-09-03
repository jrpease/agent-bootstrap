#!/usr/bin/env python3
"""For each top studio, fetch its Awwwards profile and harvest live project URLs + own domain."""
import csv, collections, re, time, sys, json, urllib.request

UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/126.0 Safari/537.36')
SKIP = re.compile(r'awwwards|google|facebook|twitter|instagram|linkedin|youtube|vimeo|'
                  r'behance|dribbble|x\.com|cdn|gstatic|apple\.com|gmpg|w3\.org', re.I)

def fetch(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read().decode('utf-8', 'ignore')
    except Exception as e:
        print(f"# FAIL {url} :: {e}", file=sys.stderr); return ''

rows = [r for r in csv.reader(open('raw.tsv'), delimiter='\t') if len(r) >= 5 and r[3]]
by = collections.defaultdict(lambda: {'n': 0, 'cats': set(), 'slug': ''})
for cat, slug, live, studio, surl in rows:
    d = by[studio]; d['n'] += 1; d['cats'].add(cat)
    if surl: d['slug'] = surl

rank = sorted(by.items(), key=lambda kv: (-len(kv[1]['cats']), -kv[1]['n'], kv[0].lower()))
top = [(s, d) for s, d in rank if d['slug']][:20]

out = {}
for studio, d in top:
    html = fetch(f"https://www.awwwards.com/{d['slug']}/")
    urls = sorted({u for u in re.findall(r'href="(https?://[^"]+)"', html) if not SKIP.search(u)})
    # own domain = the shortest bare-root url whose host echoes the studio name
    key = re.sub(r'[^a-z0-9]', '', studio.lower())
    own = ''
    for u in urls:
        host = re.sub(r'^https?://(www\.)?', '', u).split('/')[0]
        bare = re.sub(r'[^a-z0-9]', '', host.split('.')[0])
        if bare and (bare in key or key.startswith(bare)) and len(bare) > 3:
            if not own or len(u) < len(own): own = u
    out[studio] = {'slug': d['slug'], 'cats': sorted(d['cats']), 'n': d['n'],
                   'own': own, 'projects': urls}
    print(f"{studio:26} own={own or '-':38} projects={len(urls)}", file=sys.stderr)
    time.sleep(1.5)

json.dump(out, open('studios.json', 'w'), indent=1)
print(f"\n# {len(out)} studios, {sum(len(v['projects']) for v in out.values())} project urls", file=sys.stderr)
