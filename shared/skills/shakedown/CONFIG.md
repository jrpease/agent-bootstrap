# Shakedown config

One `config.json` per product, in the product's QA folder (default `~/Dev/<product>-qa/`).
Setup writes it; `shakedown.py validate` checks it. See `config.example.json`.

| Field | Required | Meaning |
|---|---|---|
| `product` | yes | Short name, used in `/shakedown <product>` and the product index. Lowercase letters, digits and `-`. |
| `repos` | yes | List of `{path, kind}`. `kind` is `frontend` or `api`. At least one. Paths may start with `~/`. |
| `targets.nonprod` | one of the two | `{app, api}` URLs of a non-production environment. Runs use it by default. |
| `targets.prod` | one of the two | `{app, api}` URLs of production. Used only with `prod`, or when there is no `nonprod`. |
| `roles` | for a logged-in stage | List of `{name, description}`. A role named `newuser` is the single-use signup account. |
| `devices` | yes | Profile names from `harness/harness.cjs` `PROFILES`. |
| `offLimits` | yes (may be empty) | Plain-language things no tester may touch. Prep reads it when proposing allowed kinds. |
| `session.cookie` | for a logged-in stage | The cookie whose absence means the browser is logged out. |
| `session.authPath` | no | URL fragment of responses that rotate the session; the harness saves the session after each. |
| `scrollContainer` | no | CSS selector of the element that scrolls, when the app doesn't scroll the window. `null` means the window. |
| `api.tokenEnv` | for API-only products | Name of the environment variable holding the API token. Never read on production. |

A product with no `frontend` repo is API-only: it runs the API contract, code review and
permissions lanes only.
