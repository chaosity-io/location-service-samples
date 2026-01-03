import MapDemo from '@/components/MapDemo'

export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Location Service Map Demo
          </h1>
          <p className="text-gray-600">
            Interactive map with geocoding search powered by AWS Location Service
          </p>
        </div>
        
        <MapDemo />
        
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Features</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span>Interactive map with MapLibre GL</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span>Geocoding search with autocomplete</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span>Geolocation support</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              <span>Navigation controls and scale</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  )
}
