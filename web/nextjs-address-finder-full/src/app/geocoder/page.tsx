import MapGeocoder from '@/components/MapGeocoder'

export default function GeocoderPage() {
  return (
    <main className="py-8">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-6">
          <h1 className="mb-1 text-3xl font-bold text-gray-900">
            Map geocoder
          </h1>
          <p className="text-gray-600">
            The MapLibre geocoder control wired to the SDK&rsquo;s{' '}
            <code>GeoPlaces</code> adapter: <code>Suggest</code> on every
            keystroke (proximity = map centre, countries = the global
            selection), <code>GetPlace</code> on select, <code>Geocode</code> on
            Enter.
          </p>
        </div>

        <MapGeocoder />
      </div>
    </main>
  )
}
