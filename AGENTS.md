# AGENTS.md

Notes for anyone — human or coding agent — working in this repository.
`README.md` explains what the samples are; `SAMPLE_TEMPLATE.md` is the shape a
new one must follow.

These are runnable integrations with the Chaosity Location Service, grouped by
host: `web/` (Next.js and vanilla JS), `backend/` (Node/Express), `mobile/`
(Expo). They are read as documentation far more often than they are run, so a
sample that is subtly wrong teaches the wrong thing to everyone who copies it.

## There is no monorepo

**No root `package.json`, no workspaces, no shared lockfile.** Every sample is an
independent project with its own dependencies:

```bash
cd web/nextjs-address-finder-full
npm ci        # per sample — a root install does not exist
npm run dev
```

**There are no git hooks in this repository.** Nothing runs before a push, so
the checks are yours to run — and to run in every sample you touched, since a
change that touches several samples means running the install and the checks in
each one. Scripts are not uniform either — most web samples have `dev`/`build`,
backend samples add `start` and a `tsc` build, and only some have `test` or
`format:check`. Read the sample's own `package.json` rather than assuming.

## Every web sample binds port 3001

All eight Next.js samples run `next dev -p 3001`, so **only one can run at a
time**. A second one fails to start, or worse, you drive the wrong app and
conclude the code is broken. Stop the first, or pass a different port
explicitly.

## The `Origin` header is why a sample 403s

Every request to the service except `/auth/token` needs an `Origin` header the
application allows, and is refused with **403 without one** — server-side calls
included, not just browsers. In the browser samples the browser sets it. In the
`backend/` and `vanilla-js-token/backend` samples the code must set it
explicitly.

If a sample suddenly returns 403 and nothing about the credentials changed, this
is the first thing to check. The second is whether the plan the application is on
actually grants the endpoint being called — a lower tier returns 403 "not
entitled" rather than a 404.

## A client range on `0.x` never leaves its minor

**A caret range on a `0.x` version never crosses a minor.** npm treats each
`0.x` minor as incompatible, so `^0.10.0` will not resolve `0.11.0`. A sample
stays on whatever minor its range was last moved to, and nothing moves it for
you. What each package here declares:

```bash
for f in $(git ls-files '*package.json'); do node -e "
const p = require('./$f'), d = { ...p.dependencies, ...p.devDependencies };
const c = Object.entries(d).filter(([k]) => k.startsWith('@chaosity/'));
if (c.length) console.log('$f', c.map(([k, v]) => k + '@' + v).join(' '))"; done
```

Consequences, both of which have bitten:

- **A sample demonstrating an API that only exists in a newer client will not
  work when someone follows it.** Bump the range in that sample's
  `package.json`, run `npm ci`, and actually run it before claiming the sample
  is fixed.
- **Do not copy a range from an existing sample into a new one.** Take the
  current published version.

## A map needs MapLibre's worker served

`maplibre-gl` 6 runs its worker from a module file, and a bundler hides that
file from it: without the steps below, a map mounts, draws no tile, and logs
"Worker failed to load". So every sample that draws a map with it:

- copies `maplibre-gl-worker.mjs` and the `maplibre-gl-shared.mjs` it imports
  into `public/maplibre/` with `scripts/copy-maplibre-worker.mjs`, run by
  `predev` and `prebuild`. The copy is git-ignored and lint-ignored, and it is
  always the installed version;
- calls `setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')` once, in the module
  that builds the map, before the first `new Map`.

A new map sample needs both. Import `maplibre-gl` as a namespace
(`import * as maplibregl`): it has no default export. The floor is 6.4.1,
because every earlier release carries GHSA-jrc7-96c5-q579, an XSS in the
attribution control.

## Credentials

Each sample that needs configuration ships a `.env.example` listing the required
variables. Copy it to `.env` locally; never commit a real client id or secret,
and never paste one into a README, a screenshot, or an issue. A sample's job is
to show the _shape_ of the configuration, not to carry working credentials.

## Adding a sample

Follow `SAMPLE_TEMPLATE.md`: its own `README.md`, `.env.example`, `.gitignore`,
and a screenshot. A sample that does not run from a clean clone with only the
steps in its README is not finished — that walkthrough is the actual deliverable,
not the source.
