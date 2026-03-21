import MapDemo from '@/components/MapDemo'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Location Service Map Demo
          </h1>
          <p className="text-lg text-gray-600">
            Interactive map with geocoding, multiple styles, and advanced
            filters
          </p>
        </div>

        <MapDemo />

        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Features</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-blue-50 p-4">
              <h3 className="mb-2 font-semibold text-blue-900">
                Multiple Map Styles
              </h3>
              <p className="text-sm text-blue-700">
                Standard, Monochrome, Hybrid, and Satellite views
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <h3 className="mb-2 font-semibold text-green-900">
                Color Schemes
              </h3>
              <p className="text-sm text-green-700">
                Light and Dark themes for better visibility
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 p-4">
              <h3 className="mb-2 font-semibold text-purple-900">
                Political Views
              </h3>
              <p className="text-sm text-purple-700">
                Country-specific boundary representations
              </p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4">
              <h3 className="mb-2 font-semibold text-yellow-900">
                Smart Geocoding
              </h3>
              <p className="text-sm text-yellow-700">
                Real-time search with autocomplete
              </p>
            </div>
            <div className="rounded-lg bg-red-50 p-4">
              <h3 className="mb-2 font-semibold text-red-900">
                Multi-language
              </h3>
              <p className="text-sm text-red-700">
                12 languages including English, Spanish, Japanese
              </p>
            </div>
            <div className="rounded-lg bg-indigo-50 p-4">
              <h3 className="mb-2 font-semibold text-indigo-900">
                Country Filters
              </h3>
              <p className="text-sm text-indigo-700">
                Restrict search results to specific countries
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
