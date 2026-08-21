# Location Service testbed — `nextjs-address-finder-full`

One Next.js app that exercises **every** Location Service scenario against one
API and one set of application credentials. It is the standing verification
vehicle for API and SDK changes: launch it against the sandbox, drive the page
that matches the change, and look at what comes back.

| Page | What it exercises | API routes |
|---|---|---|
| `/` Address finder | direct SDK commands: `Autocomplete` **or** `Geocode` while typing (map-centre bias, country filter, language), `GetPlace` on select, `ReverseGeocode` on map click and for "use my location"; map style / colour scheme / political view / terrain / globe | `POST /address/autocomplete`, `/address/geocode`, `/address/place`, `/address/search/reverse-geocode`; `GET /maps/{style}/descriptor`, `/maps/tiles/…`, `/maps/glyphs/…`, `/maps/styles/…/sprites/…` |
| `/geocoder` Map geocoder | the MapLibre geocoder control through the SDK's `GeoPlaces` adapter: `Suggest` per keystroke → `GetPlace` on select; `Geocode` for country fly-to; `useMapLanguage` | `POST /address/suggestion`, `/address/place`, `/address/geocode` + the maps routes |
| `/address-form` Address form | `@chaosity/address-form`: `Autocomplete` (Core) or `Suggest` (Pro) mode, `GetPlace` on select (secondary addresses), `ReverseGeocode` for the location button, structured submit | `POST /address/autocomplete` or `/address/suggestion`, `/address/place`, `/address/search/reverse-geocode` |
| `/nearby` Nearby & text | `SearchNearby` (radius + category filter) and `SearchText` (bias position) from a click-set position, results pinned, **raw response shown**; static map image via an authenticated fetch | `POST /address/search/nearby`, `/address/search/text`; `GET /maps/static/{fileName}` (Enterprise tier) |
| `/server` Server-side | a route handler calling the API from the server with **Bearer** (`LocationServiceConnector`, token from client credentials) or **Basic** (direct), `Origin` forwarded; any of the seven Places operations with editable JSON input | all `POST /address/*` |

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
2. Open the page that matches the change; watch the network panel and the
   **Raw response** block on `/nearby` and `/server` — those show exactly what
   the API forwarded and returned.
3. For cache / contract changes, `/server` is the quickest way to send a
   precise body (e.g. the same `SearchNearby` position with two different
   `Filter.IncludeCategories` values, or a body carrying `IntendedUse`).
4. Server-side behaviour (Basic vs Bearer, Origin handling) is `/server`.

## Scripts

`npm run dev` · `npm run build` · `npm run start` · `npm run lint` (ESLint CLI,
Next 16 flat config) · `npm run typecheck` · `npm run format`

## Notes

- Next 16 / React 19; ESLint flat config from `eslint-config-next` (no `next lint`).
- All `@chaosity/*` packages resolve from the npm registry — the lockfile must
  never point at local checkouts.
- The address form's `intendedUse` submit option is kept at `SingleUse`; the
  API does not forward `IntendedUse` regardless.
