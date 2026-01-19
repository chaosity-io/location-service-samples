'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, MapPin, Navigation, Layers, Zap } from 'lucide-react'
import { geocodeAddress, reverseGeocode } from '@/lib/actions/geocoding'

interface Location {
  lat: number
  lng: number
  address?: string
}

export default function MapDemo() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [markers, setMarkers] = useState<google.maps.Marker[]>([])
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.google && mapRef.current) {
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.0060 },
        zoom: 13,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      })
      setMap(mapInstance)
      
      // Add click listener for reverse geocoding
      mapInstance.addListener('click', async (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          const lat = event.latLng.lat()
          const lng = event.latLng.lng()
          
          const result = await reverseGeocode(lat, lng)
          if ('error' in result) {
            console.error('Reverse geocoding failed:', result.error)
          } else {
            addMarker({ lat, lng, address: result.address })
          }
        }
      })
    }
  }, [])

  const handleSearch = async () => {
    if (!searchQuery || !map) return
    
    setIsLoading(true)
    try {
      const result = await geocodeAddress(searchQuery)
      
      if ('error' in result) {
        console.error('Geocoding failed:', result.error)
      } else {
        const location = { lat: result.lat, lng: result.lng, address: result.address }
        addMarker(location)
        map.setCenter(location)
        map.setZoom(15)
      }
    } catch (error) {
      console.error('Geocoding error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addMarker = (location: Location) => {
    if (!map) return

    const marker = new google.maps.Marker({
      position: location,
      map: map,
      title: location.address || 'Location',
      animation: google.maps.Animation.DROP
    })

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div class="p-2">
          <h3 class="font-semibold">${location.address || 'Custom Location'}</h3>
          <p class="text-sm text-gray-600">
            Lat: ${location.lat.toFixed(6)}<br>
            Lng: ${location.lng.toFixed(6)}
          </p>
        </div>
      `
    })

    marker.addListener('click', () => {
      infoWindow.open(map, marker)
    })

    setMarkers(prev => [...prev, marker])
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Your Location'
          }
          setCurrentLocation(location)
          if (map) {
            map.setCenter(location)
            map.setZoom(15)
            addMarker(location)
          }
        },
        (error) => {
          console.error('Geolocation error:', error)
        }
      )
    }
  }

  const clearMarkers = () => {
    markers.forEach(marker => marker.setMap(null))
    setMarkers([])
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold mb-4">Interactive Maps Demo</h2>
        
        {/* Search Bar */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for an address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Controls */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={getCurrentLocation}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Navigation className="w-4 h-4" />
            My Location
          </button>
          <button
            onClick={clearMarkers}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <MapPin className="w-4 h-4" />
            Clear Markers
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative">
        <div ref={mapRef} className="w-full h-96" />
        
        {/* Map Overlay Info */}
        <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-md">
          <div className="text-sm">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span className="font-semibold">Features Active</span>
            </div>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Geocoding & Reverse Geocoding</li>
              <li>• Custom Map Styling</li>
              <li>• Interactive Markers</li>
              <li>• Real-time Search</li>
            </ul>
          </div>
        </div>
      </div>

      {/* API Info */}
      <div className="p-4 bg-gray-50 border-t">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <span className="font-semibold">Powered by Chaosity Location API</span>
        </div>
        <p className="text-sm text-gray-600 mb-2">
          This demo showcases real-time geocoding, address validation, and interactive mapping capabilities.
        </p>
        <div className="text-xs text-gray-500">
          • Click anywhere on the map for reverse geocoding
          • Search for addresses with real-time validation
          • Get your current location with GPS
        </div>
      </div>
    </div>
  )
}