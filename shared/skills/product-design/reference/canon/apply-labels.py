#!/usr/bin/env python3
"""apply-labels.py — write momentType into a clip's segmentation, then emit its
canon entry. Labels come from reading the contact sheets in sheets/."""
import json, sys, os

LABELS = {
  # in-app product motion, Corner iOS — map, create-post, place detail
  'corner-ios': ('in-app', {
    1:'reveal', 4:'reveal', 5:'transition', 6:'transition', 7:'reveal',
    8:'reveal', 9:'transition', 10:'drop', 11:'reveal'}),
  # in-app product motion, Corner iOS — signup, permissions, profile, date picker
  'corner-flow-2': ('in-app', {
    1:'transition', 2:'reveal', 3:'reveal', 4:'drop', 5:'drop', 6:'reveal',
    7:'transition', 8:'feedback', 9:'transition', 10:'transition',
    11:'feedback', 12:'feedback', 13:'transition', 14:'drop', 16:'transition'}),

  # Duolingo iOS — course-selection onboarding. Only moments 62-70 are labelled:
  # those are the ones whose contact sheet was actually read. The other 60 stay
  # unlabelled and therefore out of the medians. An unread moment is not data.
  'duolingo-1': ('in-app', {
    62:'feedback', 63:'transition', 64:'reveal', 65:'reveal', 66:'feedback',
    67:'feedback', 68:'transition', 69:'reveal', 70:'reveal'}),
  # Duolingo iOS — add-a-widget tutorial
  'duolingo-2': ('in-app', {
    0:'feedback', 1:'transition', 2:'transition', 3:'feedback', 4:'feedback',
    5:'feedback', 6:'transition', 7:'transition', 8:'reveal', 9:'reveal'}),
  # Duolingo ABC — a lesson, including the gold-book award and its sparkle burst.
  # The first reward moments in the canon.
  'duolingo-3': ('in-app', {
    0:'transition', 1:'reveal', 3:'reveal', 4:'reveal', 5:'transition',
    6:'transition', 7:'reward', 8:'feedback', 9:'reward', 10:'reward'}),
  # UNIDENTIFIED vocabulary app. Harvested from the Duolingo flows page, but the
  # design language is plainly not Duolingo's — cream ground, serif display, a
  # "Rush" practice mode. Recorded as unidentified rather than mislabelled: the
  # moments are real in-app product motion either way, and a wrong app name in
  # the canon is worse than an honest gap.
  'unidentified-vocab': ('in-app', {
    0:'transition', 2:'transition', 3:'transition', 4:'feedback',
    5:'feedback', 6:'reward'}),
  # NOT product motion: a kinetic-typography onboarding promo reel. Excluded
  # from the product medians for the same reason the Notion marketing page was
  # excluded from the craft numbers — it is a different discipline wearing the
  # same app's chrome.
  'corner-flow-1': ('onboarding-promo', {}),
}

for stem, (kind, labels) in LABELS.items():
    segpath = f'shots/{stem}.seg.json'
    if not os.path.exists(segpath):
        print(f'skip {stem}: no segmentation'); continue
    seg = json.load(open(segpath))
    kept = []
    for m in seg['moments']:
        if m['suspect']:
            continue
        t = labels.get(m['index'])
        m['momentType'] = t
        if kind != 'in-app' or t in (None, 'drop'):
            continue
        kept.append({
            'entry': stem, 'momentType': t,
            'durationMs': m['durationMs'], 'coverage': m['coverage'],
            'travelFraction': m['travelFraction'],
            'participants': m['participants'],
            'choreographyDepth': m['choreographyDepth'],
            'provenance': {k: 'derived' for k in
                           ('durationMs','coverage','travel','participants','choreographyDepth')}
                          | {'momentType': 'operator-from-contact-sheet'},
        })
    json.dump(seg, open(segpath, 'w'), indent=1)
    entry = {'entry': f'Corner iOS ({stem})', 'surface': 'ios',
             'acquisition': 'mobbin-video', 'clipKind': kind,
             'craft': {}, 'moments': kept}
    if kind != 'in-app':
        entry['excluded'] = 'onboarding promo reel — kinetic typography, not in-app product motion'
    json.dump(entry, open(f'entries/motion-{stem}.json','w'), indent=1)
    print(f'{stem:<16} {kind:<18} {len(kept)} moments kept')
