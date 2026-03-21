import AddressFinder from '@/components/AddressFinder'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Address Finder & Validator
          </h1>
          <p className="text-lg text-gray-600">
            Search, validate, and visualize addresses with autocomplete
          </p>
        </div>

        <AddressFinder />

        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Features</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-blue-50 p-4">
              <h3 className="mb-2 font-semibold text-blue-900">
                🔍 Smart Autocomplete
              </h3>
              <p className="text-sm text-blue-700">
                Real-time address suggestions as you type
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <h3 className="mb-2 font-semibold text-green-900">
                ✓ Address Validation
              </h3>
              <p className="text-sm text-green-700">
                Verify and parse address components
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 p-4">
              <h3 className="mb-2 font-semibold text-purple-900">
                📍 Geolocation
              </h3>
              <p className="text-sm text-purple-700">
                Use your current location to find address
              </p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4">
              <h3 className="mb-2 font-semibold text-yellow-900">
                🗺️ Map Visualization
              </h3>
              <p className="text-sm text-yellow-700">
                See exact location on interactive map
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
