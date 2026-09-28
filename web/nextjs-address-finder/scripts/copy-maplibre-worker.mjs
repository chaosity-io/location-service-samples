// MapLibre 6 runs its worker from a file the app serves. Copy the worker and
// the shared chunk it imports into public/maplibre/, from whichever maplibre-gl
// is installed, so the two always match. `predev` and `prebuild` run this.
import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const pkg = createRequire(import.meta.url).resolve('maplibre-gl/package.json')
const dist = path.join(path.dirname(pkg), 'dist')
const dest = path.join(process.cwd(), 'public', 'maplibre')
mkdirSync(dest, { recursive: true })
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(path.join(dist, file), path.join(dest, file))
}
