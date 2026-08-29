import type maplibregl from 'maplibre-gl'
import type { StyleSpecification } from 'maplibre-gl'

/**
 * Label-language rewrite that leaves non-name labels alone.
 *
 * WHY THIS IS HERE AND NOT `applyMapLanguage` / `fetchMapStyle({ language })`
 * FROM THE CLIENT LIBRARY (location-service-client#28)
 *
 * Both library helpers replace `text-field` on EVERY symbol layer with a
 * `name:<lang>` coalesce. The AWS Standard descriptor has 62 symbol layers and
 * 30 of them do not label by name at all:
 *
 *   building_label_number   ["to-string", ["get", "addr_housenumber"]]   house numbers
 *   shield_*  (29 layers)   ["to-string", ["get", "shield_text"]]        road shields
 *
 * After the rewrite those read a `name` their features do not have, so house
 * numbers and road shields vanish from any map that applied a language — even
 * `en`. That was the "one map shows house numbers, the others don't": the page
 * without a language kept them.
 *
 * Only a text-field that already references `name` is rewritten here. Delete
 * this file and go back to the library helpers once #28 ships.
 */

export function languageExpression(language: string): unknown[] {
  return language === 'en'
    ? ['coalesce', ['get', 'name:en'], ['get', 'name']]
    : [
        'coalesce',
        ['get', `name:${language}`],
        ['get', 'name:en'],
        ['get', 'name'],
      ]
}

function labelsByName(textField: unknown): boolean {
  // `name`, `name:en`, `name_en`, `{name}` — anything that reads a name property.
  return JSON.stringify(textField).includes('name')
}

/** Rewrite the descriptor in place, before MapLibre parses it — no flash. */
export function applyLanguageToStyle(
  style: StyleSpecification,
  language: string,
): StyleSpecification {
  const expression = languageExpression(language)
  for (const layer of style.layers) {
    if (layer.type !== 'symbol') continue
    const layout = layer.layout as Record<string, unknown> | undefined
    if (layout?.['text-field'] === undefined) continue
    if (!labelsByName(layout['text-field'])) continue
    layout['text-field'] = expression
  }
  return style
}

/** Rewrite a live map's labels — a language change without a descriptor fetch. */
export function applyLanguageToMap(
  map: maplibregl.Map,
  language: string,
): void {
  const expression = languageExpression(language)
  for (const layer of map.getStyle().layers) {
    if (layer.type !== 'symbol') continue
    const current = map.getLayoutProperty(layer.id, 'text-field')
    if (current === undefined || current === null) continue
    if (!labelsByName(current)) continue
    map.setLayoutProperty(layer.id, 'text-field', expression)
  }
}
