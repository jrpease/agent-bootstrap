# Pinterest — not captured

Attempted twice via logged-in Chrome at `https://www.pinterest.com/`. The document contains 1,342
elements and `readyState: complete`, but **every element has a zero-size bounding box** and
`document.body.scrollHeight` equals the viewport height exactly — the page never laid out. One
iframe is present, consistent with a bot/challenge stub rather than the real feed.

`surface-check.js` returned CHECK and the measurement was discarded rather than recorded. Zeros
entering the canon as "Pinterest has no type contrast" would have been worse than the gap.

Two ways to close it, in preference order:
1. Capture Pinterest from **Mobbin** — it is in the library, and the masonry feed is exactly the
   kind of pattern Mobbin indexes well.
2. Re-run with the tab **foregrounded**, which may be what the stub is keying on.
