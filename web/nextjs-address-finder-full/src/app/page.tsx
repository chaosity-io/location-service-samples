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
            <code>Geocode</code> while typing — biased to the map centre,
            filtered to the country selected in the bar above, in the selected
            language — <code>GetPlace</code> on select,{' '}
            <code>ReverseGeocode</code> on map click and for &ldquo;use my
            location&rdquo;.
          </p>
        </div>

        <AddressFinder />
      </div>
    </main>
  )
}
