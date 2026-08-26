import type maplibregl from 'maplibre-gl'

/**
 * Toggle the AWS Standard style's 3D buildings.
 *
 * The two layers `buildings: 'Buildings3D'` adds to the style descriptor,
 * confirmed by diffing the descriptor with and without the option (160 layers
 * vs 162):
 *
 *   building_extrusion       fill-extrusion
 *   building_line_extrusion  line
 *
 * WHY VISIBILITY RATHER THAN RE-FETCHING THE STYLE
 *
 * The obvious implementation is to drop `Buildings3D` from the style request
 * and re-fetch when toggled. That costs a `/maps/{style}/descriptor` call per
 * toggle — and a descriptor load is exactly what the metering counts as a map
 * load, so flipping the button repeatedly would bill the customer for map
 * loads they never made. Keeping the layers in the style and hiding them is
 * free and instant.
 */

export const BUILDING_LAYER_IDS = [
  'building_extrusion',
  'building_line_extrusion',
] as const

/** Show or hide the buildings layers, ignoring styles that lack them. */
export function setBuildingsVisible(
  map: maplibregl.Map,
  visible: boolean,
): void {
  for (const id of BUILDING_LAYER_IDS) {
    // Raster styles (Satellite, Hybrid) have no extrusion layers at all, and
    // setLayoutProperty on a missing layer throws.
    if (!map.getLayer(id)) continue
    map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
  }
}

const BUILDING_ICON = `
<svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
  <path d="M3 18V7.5L9 4v14H3Zm1.5-1.5h3V6.6l-3 1.75V16.5Z"/>
  <path d="M10 18V8l7 3.2V18h-7Zm1.5-1.5h4v-4.3l-4-1.83V16.5Z"/>
  <path d="M5 9.5h1.5V11H5V9.5Zm0 3h1.5V14H5v-1.5Zm7.5 0H14V14h-1.5v-1.5Z"/>
</svg>`

/**
 * A MapLibre control that matches the built-in globe and terrain buttons.
 *
 * Off by default: 3D buildings obscure the streets and labels underneath, and
 * this map's job is finding an address. Someone who wants the buildings can
 * ask for them.
 */
export class BuildingsControl implements maplibregl.IControl {
  private container: HTMLDivElement | null = null
  private button: HTMLButtonElement | null = null
  private map: maplibregl.Map | null = null
  private visible: boolean
  private onStyleData = () => {
    // `setStyle` replaces every layer, so a style change (map style, colour
    // scheme, political view) resets visibility to whatever the descriptor
    // says — which is "visible". Re-apply the user's choice each time, or the
    // buildings silently come back when they change the colour scheme.
    if (this.map) setBuildingsVisible(this.map, this.visible)
  }

  constructor(options: { initiallyVisible?: boolean } = {}) {
    this.visible = options.initiallyVisible ?? false
  }

  onAdd(map: maplibregl.Map): HTMLElement {
    this.map = map

    const container = document.createElement('div')
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group'

    const button = document.createElement('button')
    button.type = 'button'
    button.innerHTML = BUILDING_ICON
    button.addEventListener('click', () => this.toggle())
    container.appendChild(button)

    this.container = container
    this.button = button
    this.syncButton()

    map.on('styledata', this.onStyleData)
    // The style may already be loaded when the control is added.
    setBuildingsVisible(map, this.visible)

    return container
  }

  onRemove(): void {
    this.map?.off('styledata', this.onStyleData)
    this.container?.parentNode?.removeChild(this.container)
    this.container = null
    this.button = null
    this.map = null
  }

  private toggle(): void {
    this.visible = !this.visible
    if (this.map) setBuildingsVisible(this.map, this.visible)
    this.syncButton()
  }

  private syncButton(): void {
    if (!this.button) return
    const label = this.visible ? 'Hide 3D buildings' : 'Show 3D buildings'
    this.button.title = label
    this.button.setAttribute('aria-label', label)
    this.button.setAttribute('aria-pressed', String(this.visible))
    this.button.style.opacity = this.visible ? '1' : '0.55'
  }
}
