import AddressFinder from '@/components/AddressFinder'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Address Finder & Validator</h1>
          <p className="text-lg text-gray-600">Search, validate, and visualize addresses with autocomplete</p>
        </div>
        
        <AddressFinder />
        
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">🔍 Smart Autocomplete</h3>
              <p className="text-sm text-blue-700">Real-time address suggestions as you type</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">✓ Address Validation</h3>
              <p className="text-sm text-green-700">Verify and parse address components</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">📍 Geolocation</h3>
              <p className="text-sm text-purple-700">Use your current location to find address</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">🗺️ Map Visualization</h3>
              <p className="text-sm text-yellow-700">See exact location on interactive map</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
