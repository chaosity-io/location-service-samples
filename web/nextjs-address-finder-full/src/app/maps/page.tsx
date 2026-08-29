import MapsShowcase from '@/components/MapsShowcase'

export default function MapsPage() {
  return (
    <main className="py-8">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-6">
          <h1 className="mb-1 text-3xl font-bold text-gray-900">Maps</h1>
          <p className="text-gray-600">
            The map as the thing under test. The style descriptor, tiles, glyphs
            and sprites all come through the API with a bearer token per
            request; the <strong>Map</strong> controls in the bar above choose
            the style, colour scheme, political view, terrain, 3D buildings,
            contours, traffic, travel modes, language and projection — and every
            page&rsquo;s map follows. This page also toggles POI layers
            client-side and renders the static map of the current view.
          </p>
        </div>

        <MapsShowcase />
      </div>
    </main>
  )
}
