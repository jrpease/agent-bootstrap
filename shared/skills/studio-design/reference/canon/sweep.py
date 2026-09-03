#!/usr/bin/env python3
"""Extract (project, live_url, studio, studio_url) cards from an Awwwards listing page."""
import re, sys, time, urllib.request, urllib.error

UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/126.0 Safari/537.36')

def fetch(url, tries=2):
    for n in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode('utf-8', 'ignore')
        except Exception as e:
            if n == tries - 1:
                print(f"# FAIL {url} :: {e}", file=sys.stderr)
                return ''
            time.sleep(2)

def cards(html):
    out = []
    for blk in re.split(r'(?=<div[^>]*class="[^"]*card-site\b)', html)[1:]:
        blk = blk[:8000]
        hrefs = re.findall(r'href="([^"]+)"', blk)
        slug = next((h for h in hrefs if h.startswith('/sites/')), '')
        live = next((h for h in hrefs if h.startswith('http') and 'awwwards.com' not in h), '')
        studio_url = next((h for h in hrefs if re.fullmatch(r'/[A-Za-z0-9._%-]+/', h)), '')
        studio = re.search(r'<h3[^>]*avatar-name__title[^>]*>([^<]+)</h3>', blk)
        if slug or live:
            out.append((
                slug.replace('/sites/', '').strip('/'),
                live,
                (studio.group(1).strip() if studio else ''),
                studio_url.strip('/'),
            ))
    return out

if __name__ == '__main__':
    for url in sys.argv[1:]:
        h = fetch(url)
        rows = cards(h)
        print(f"# {url} -> {len(rows)} cards", file=sys.stderr)
        for r in rows:
            print('\t'.join(r))
        time.sleep(1.5)
