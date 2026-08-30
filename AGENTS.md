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

## Most samples are pinned to a client version they can never leave

11 of the 12 packages here declare `"@chaosity/location-client": "^0.1.14"`. The
published client is well past that, and **a caret range on a `0.x` version never
crosses a minor** — npm treats each `0.x` minor as incompatible, so `^0.1.14`
will not resolve `0.2.0`, let alone `0.5.x`. These samples are frozen four
minors back and will not move on their own.

Only `web/nextjs-address-finder-full` tracks the current client.

Consequences, both of which have bitten:

- **A sample demonstrating an API that only exists in a newer client will not
  work when someone follows it.** Bump the range in that sample's
  `package.json`, run `npm ci`, and actually run it before claiming the sample
  is fixed.
- **Do not copy a range from an existing sample into a new one.** Take the
  current published version.

Tracked in #16.

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
