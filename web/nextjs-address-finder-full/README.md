# Location Service testbed — `nextjs-address-finder-full`

One Next.js app that exercises **every** Location Service scenario against one
API and one set of application credentials. It is the standing verification
vehicle for API and SDK changes: launch it against the sandbox, drive the page
that matches the change, and look at what comes back.

## The global bar

Two things are global — set once, kept in `localStorage`, applied on every page:

| Control | What it does | Where it lives |
|---|---|---|
| **Country** | Frames every map on the country's bounds and goes into every query that takes one (`Filter.IncludeCountries` on Autocomplete / Geocode / Suggest / SearchText / SearchNearby, the geocoder control's `setCountries`, the address form's country list). The list is the **application's country scope from the token** (`client.getAppConfig().countries`, api#65) — a scoped application offers exactly its scope, because the API narrows every request to it anyway (api#42); an unscoped one offers the whole table plus *Worldwide*. | `src/lib/settings/country.ts`, bounds in `src/lib/countries.ts` |
| **Map** | Style, colour scheme, political view, terrain, 3D buildings, contours, traffic, travel modes, label language, globe projection. Defaults to the plain **Standard / Light** map with nothing on. A style or overlay change re-fetches the descriptor on each open map (a billable map load); language and globe are applied client-side. | `src/lib/settings/map-settings.ts`, consumed by `src/lib/map/useTestbedMap.ts` |

Every map on every page is built by the one `useTestbedMap` hook, so they all
start in the same place, draw the same way and react to the bar the same way.

## Pages

| Page | What it exercises | API routes |
|---|---|---|
| `/` Address finder | direct SDK commands: `Autocomplete` **or** `Geocode` while typing (map-centre bias, country, language), `GetPlace` on select, `ReverseGeocode` on map click and for "use my location"; raw response shown | `POST /address/autocomplete`, `/address/geocode`, `/address/place`, `/address/search/reverse-geocode` |
| `/geocoder` Map geocoder | the MapLibre geocoder control through the SDK's `GeoPlaces` adapter: `Suggest` per keystroke → `GetPlace` on select, `Geocode` on Enter; selected Carmen feature shown | `POST /address/suggestion`, `/address/place`, `/address/geocode` |
| `/address-form` Address form | `@chaosity/address-form`: `Autocomplete` (Core) or `Suggest` (Pro) mode, `GetPlace` on select, `ReverseGeocode` for the location button, structured submit | `POST /address/autocomplete` or `/address/suggestion`, `/address/place`, `/address/search/reverse-geocode` |
| `/nearby` Nearby & text | `SearchNearby` (radius + category) and `SearchText` (bias position) from the map centre or a clicked point, results pinned, raw response shown | `POST /address/search/nearby`, `/address/search/text` |
| `/maps` Maps | the map as the thing under test: the descriptor URL the settings produce, layer/source stats, POI layer toggles (`setPoiVisibility`, client-side), static map of the current view via `fetchStaticMap` (Enterprise) | `GET /maps/{style}/descriptor`, `/maps/tiles/…`, `/maps/glyphs/…`, `/maps/styles/…/sprites/…`, `/maps/static/{fileName}` |
| `/server` Server-side | a route handler calling the API from the server with **Bearer** (`LocationServiceConnector`) or **Basic** (direct), `Origin` forwarded; any of the seven Places operations with an editable body pre-filled for the selected country | all `POST /address/*` |

Together that is all 12 Maps V2 + Places V2 operations, the three SDK packages
(`location-client`, `location-client-react`, `address-form`), both auth modes,
and the cost-relevant paths (typeahead Label vs Core, GetPlace features).

## Setup

```bash
npm ci
cp .env.example .env.local     # fill in the values below
npm run dev                    # http://localhost:3001
```

`.env.local`:

| Variable | Side | Purpose |
|---|---|---|
| `LOCATION_API_URL` | server | API base URL, e.g. `https://sandbox01-api.chaosity.cloud` |
| `LOCATION_CLIENT_ID` / `LOCATION_CLIENT_SECRET` | server | the application's credentials from the portal — exchanged for a short-lived bearer token in a server action; never sent to the browser |
| `NEXT_PUBLIC_LOCATION_API_URL` | browser | the same base URL, for MapLibre style/tile/glyph/sprite requests and the static-map fetch (the token is attached per request) |
| `LOCATION_ALLOWED_ORIGIN` | server, optional | `Origin` the server-side playground sends when the incoming request has none |

The application's **allowed domain** in the portal must match where this app
runs — `localhost:3001` for local use. Tier matters: `/` and `/address-form`
work on Core (autocomplete/place/reverse-geocode); `/geocoder`, `/nearby` and
the maps need Pro; the static map needs Enterprise. A 403 with
`OriginNotAllowedException` or an explicit-deny means the domain or the tier,
not the credentials.

## Using it to verify a change

1. Point `.env.local` at the environment under test (sandbox first).
2. Pick the country and map settings in the bar; they stay put across pages.
3. Open the page that matches the change; watch the network panel and the
   **Raw response** block — those show exactly what the API forwarded and
   returned.
4. For cache / contract changes, `/server` is the quickest way to send a
   precise body (e.g. the same `SearchNearby` position with two different
   `Filter.IncludeCategories` values, or a body carrying `IntendedUse`).
5. Server-side behaviour (Basic vs Bearer, Origin handling) is `/server`.

## Scripts

`npm run dev` · `npm run build` · `npm run start` · `npm run lint` (ESLint CLI,
Next 16 flat config) · `npm run typecheck` · `npm run format`

## Notes

- Next 16 / React 19; ESLint flat config from `eslint-config-next` (no `next lint`).
- All `@chaosity/*` packages resolve from the npm registry — the lockfile must
  never point at local checkouts.
- **Needs `@chaosity/location-client` ≥ 0.11.0,
  `@chaosity/location-client-react` ≥ 0.9.0, `@chaosity/address-form` ≥ 0.6.0
  and `maplibre-gl` ≥ 6.4.1.** maplibre-gl up to 6.4.0 carries
  GHSA-jrc7-96c5-q579, an XSS in the attribution control, and those are the
  first releases whose ranges admit a patched one.
- MapLibre 6 runs its worker from a file the app serves:
  `scripts/copy-maplibre-worker.mjs` copies it into `public/maplibre/` before
  every `dev` and `build`, and `useTestbedMap` points MapLibre at it. Without
  that, every map mounts and draws no tile, and nothing in `typecheck`, `lint`
  or `build` notices: open a map page and watch it draw.
- Before `@chaosity/location-client` 0.5.1, the library's
  `useMapLanguage` / `fetchMapStyle({ language })` rewrote `text-field` on
  every symbol layer and blanked house numbers (`addr_housenumber`) and road
  shields (`shield_text`) — 30 of the Standard style's 62 labelled layers —
  and `fetchStaticMap` sent a raw map centre the API refused for having more
  than 14 decimals (location-service-client#28, #29).
- Country bounds come from a static table (`src/lib/countries.ts`, public
  domain), not from a `Geocode` of the country — that used to cost a billable
  request per change and answered with a point, not a box.
- The address form's `getData()` takes no `intendedUse` since address-form
  0.4.0: the API does not forward `IntendedUse`.
