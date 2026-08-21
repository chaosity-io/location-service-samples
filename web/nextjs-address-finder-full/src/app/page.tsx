import AddressFinder from '@/components/AddressFinder'

export default function Home() {
  return (
    <main className="py-8">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-6">
          <h1 className="mb-1 text-3xl font-bold text-gray-900">
            Address finder &amp; validator
          </h1>
          <p className="text-gray-600">
            Direct SDK commands against the API: <code>Autocomplete</code> or{' '}
            <code>Geocode</code> while typing (biased to the map centre, optional
            country filter), <code>GetPlace</code> on select, <code>ReverseGeocode</code>{' '}
            on map click and for &ldquo;use my location&rdquo;; the map itself loads the
            style descriptor, tiles, glyphs and sprites through the API with a bearer
            token per request.
          </p>
        </div>

        <AddressFinder />
      </div>
    </main>
  )
}
