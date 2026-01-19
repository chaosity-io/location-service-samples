'use client'

import { useState, useEffect } from 'react'
import { MapPinIcon, MagnifyingGlassIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useLocationClient } from '@chaosity/location-client-react'
import { RideShareClient } from '@/lib/adapters/RideShareClient'
import { EcommerceClient } from '@/lib/adapters/EcommerceClient'
import { GeoPlacesClient } from '@chaosity/location-client'
import { GeocodeCommand } from '@aws-sdk/client-geo-places'

const COUNTRIES = [
  { code: 'USA', name: 'United States', coords: [-95.7129, 37.0902] as [number, number] },
  { code: 'GBR', name: 'United Kingdom', coords: [-3.4360, 55.3781] as [number, number] },
  { code: 'CAN', name: 'Canada', coords: [-106.3468, 56.1304] as [number, number] },
  { code: 'DEU', name: 'Germany', coords: [10.4515, 51.1657] as [number, number] },
  { code: 'FRA', name: 'France', coords: [2.2137, 46.2276] as [number, number] },
  { code: 'JPN', name: 'Japan', coords: [138.2529, 36.2048] as [number, number] },
  { code: 'AUS', name: 'Australia', coords: [133.7751, -25.2744] as [number, number] },
]

const PLACE_CATEGORIES = [
  { 
    id: 'parking', 
    label: 'Parking', 
    icon: '🅿️',
    description: 'Find parking facilities',
    categories: ['park_and_ride', 'parking']
  },
  { 
    id: 'restaurant', 
    label: 'Restaurants', 
    icon: '🍔',
    description: 'Discover nearby restaurants',
    categories: ['restaurant']
  },
  { 
    id: 'hotel', 
    label: 'Hotels', 
    icon: '🏨',
    description: 'Find accommodations',
    categories: ['hotel', 'motel', 'lodging']
  },
]

export default function NearbyPlacesDemo() {
  const { client } = useLocationClient()
  const [locationClient, setLocationClient] = useState<RideShareClient | null>(null)
  const [addressClient, setAddressClient] = useState<EcommerceClient | null>(null)
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0])
  const [addressQuery, setAddressQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [currentAddress, setCurrentAddress] = useState<string>('')
  const [currentCoords, setCurrentCoords] = useState<[number, number] | null>(null)
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState(PLACE_CATEGORIES[0])
  const [loading, setLoading] = useState(false)
  const [detectingLocation, setDetectingLocation] = useState(false)

  useEffect(() => {
    if (client) {
      setLocationClient(new RideShareClient(client))
      setAddressClient(new EcommerceClient(client, selectedCountry.coords, 'en', selectedCountry.code))
    }
  }, [client, selectedCountry])

  useEffect(() => {
    if (addressQuery.length > 2 && addressClient) {
      const timer = setTimeout(() => {
        handleAddressSearch()
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setSuggestions([])
    }
  }, [addressQuery, addressClient])

  const handleAddressSearch = async () => {
    if (!addressClient) return
    try {
      const response = await addressClient.getSuggestions(addressQuery)
      setSuggestions(response.ResultItems || [])
    } catch (error) {
      setSuggestions([])
    }
  }

  const handleSelectAddress = async (item: any) => {
    if (!client || !locationClient) return
    
    setLoading(true)
    try {
      const command = new GeocodeCommand({
        QueryText: item.Address.Label,
        Filter: { IncludeCountries: [selectedCountry.code] },
      })
      const response = await (client as GeoPlacesClient).send(command) as any
      const coords = response.ResultItems?.[0]?.Position
      if (coords) {
        setCurrentCoords([coords[0], coords[1]])
        setCurrentAddress(item.Address.Label)
        setAddressQuery('')
        setSuggestions([])
      }
    } catch (error) {
      console.error('Geocoding error:', error)
    }
    setLoading(false)
  }

  const handleDetectLocation = () => {
    if (!navigator.geolocation || !locationClient) return
    
    setDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords: [number, number] = [position.coords.longitude, position.coords.latitude]
        setCurrentCoords(coords)
        try {
          const response = await locationClient.reverseGeocode(coords)
          const address = response.ResultItems?.[0]?.Address?.Label || 'Address not found'
          setCurrentAddress(address)
        } catch (error) {
          setCurrentAddress('Error loading address')
        }
        setDetectingLocation(false)
      },
      () => {
        setDetectingLocation(false)
      }
    )
  }

  const handleSearchNearby = async () => {
    if (!locationClient || !currentCoords) return
    
    setLoading(true)
    try {
      const response = await locationClient.searchNearby(currentCoords, selectedCategory.categories)
      setNearbyPlaces(response.ResultItems || [])
    } catch (error) {
      setNearbyPlaces([])
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
      {/* Location Selection */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <MapPinIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Your Location</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <select
              value={selectedCountry.code}
              onChange={(e) => setSelectedCountry(COUNTRIES.find(c => c.code === e.target.value)!)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Address
            </label>
            <div className="relative">
              <input
                type="text"
                value={addressQuery}
                onChange={(e) => setAddressQuery(e.target.value)}
                placeholder="Type your address..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectAddress(item)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <div className="text-sm text-gray-900">{item.Address.Label}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleDetectLocation}
              disabled={detectingLocation}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {detectingLocation ? 'Detecting...' : '📍 Use my current location'}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What are you looking for?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PLACE_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    selectedCategory.id === category.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{category.icon}</div>
                  <div className="text-xs font-medium">{category.label}</div>
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-2">{selectedCategory.description}</p>
          </div>

          {currentAddress && (
            <div className="p-4 rounded-lg border bg-green-50 border-green-200">
              <div className="flex items-start gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium text-green-800">Current Address</div>
                  <div className="text-sm text-green-700 mt-1">{currentAddress}</div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleSearchNearby}
            disabled={loading || !currentCoords}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
            {loading ? 'Searching...' : `Find Nearby ${selectedCategory.label}`}
          </button>
        </div>
      </div>

      {/* Nearby Places */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Nearby {selectedCategory.label}</h2>

        {nearbyPlaces.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Select your location and click search to discover nearby places</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {nearbyPlaces.map((place, index) => (
              <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="font-medium text-gray-900">
                  {place.Title || place.Address?.Label || 'Unknown Place'}
                </div>
                {place.Address?.Label && (
                  <div className="text-sm text-gray-600 mt-1">{place.Address.Label}</div>
                )}
                {place.Distance && (
                  <div className="text-xs text-blue-600 mt-1">
                    {(place.Distance / 1000).toFixed(2)} km away
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
