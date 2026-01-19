'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Home, MapPin, DollarSign, Bed, Bath, Square } from 'lucide-react'
import { geocodeAddress } from '@/lib/actions/geocoding'

interface Property {
  id: number
  address: string
  price: number
  beds: number
  baths: number
  sqft: number
  lat: number
  lng: number
  image: string
}

export default function RealEstateDemo() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [properties] = useState<Property[]>([
    {
      id: 1,
      address: '123 Oak Street, San Francisco, CA',
      price: 1250000,
      beds: 3,
      baths: 2,
      sqft: 1800,
      lat: 37.7749,
      lng: -122.4194,
      image: '/properties/house1.jpg'
    },
    {
      id: 2,
      address: '456 Pine Avenue, San Francisco, CA',
      price: 950000,
      beds: 2,
      baths: 2,
      sqft: 1200,
      lat: 37.7849,
      lng: -122.4094,
      image: '/properties/house2.jpg'
    },
    {
      id: 3,
      address: '789 Market Street, San Francisco, CA',
      price: 2100000,
      beds: 4,
      baths: 3,
      sqft: 2400,
      lat: 37.7649,
      lng: -122.4294,
      image: '/properties/house3.jpg'
    }
  ])
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [markers, setMarkers] = useState<google.maps.Marker[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.google && mapRef.current) {
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 12,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      })
      setMap(mapInstance)
      
      // Add property markers
      const newMarkers = properties.map(property => {
        const marker = new google.maps.Marker({
          position: { lat: property.lat, lng: property.lng },
          map: mapInstance,
          title: property.address,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="#3B82F6" stroke="white" stroke-width="2"/>
                <text x="20" y="25" text-anchor="middle" fill="white" font-size="12" font-weight="bold">
                  $${Math.round(property.price / 1000)}K
                </text>
              </svg>
            `),
            scaledSize: new google.maps.Size(40, 40)
          }
        })

        marker.addListener('click', () => {
          setSelectedProperty(property)
        })

        return marker
      })
      
      setMarkers(newMarkers)
    }
  }, [properties])

  const handleSearch = async () => {
    if (!searchQuery || !map) return
    
    const result = await geocodeAddress(searchQuery)
    if ('error' in result) {
      console.error('Search failed:', result.error)
    } else {
      map.setCenter({ lat: result.lat, lng: result.lng })
      map.setZoom(14)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6 h-[600px]">
      {/* Property List */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <Home className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold">Properties</h2>
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search by location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto max-h-96">
          {properties.map((property) => (
            <div
              key={property.id}
              onClick={() => setSelectedProperty(property)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                selectedProperty?.id === property.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="font-bold text-lg">{formatPrice(property.price)}</span>
              </div>
              <div className="text-sm text-gray-600 mb-2">{property.address}</div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Bed className="w-4 h-4" />
                  {property.beds}
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="w-4 h-4" />
                  {property.baths}
                </div>
                <div className="flex items-center gap-1">
                  <Square className="w-4 h-4" />
                  {property.sqft} sqft
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow-lg overflow-hidden">
        <div ref={mapRef} className="w-full h-full min-h-[400px]" />
      </div>

      {/* Property Details */}
      {selectedProperty && (
        <div className="lg:col-span-3 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-2xl font-bold mb-4">Property Details</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span className="text-gray-600">{selectedProperty.address}</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold">{formatPrice(selectedProperty.price)}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Bed className="w-6 h-6 mx-auto mb-1 text-gray-600" />
                  <div className="font-semibold">{selectedProperty.beds}</div>
                  <div className="text-sm text-gray-600">Bedrooms</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Bath className="w-6 h-6 mx-auto mb-1 text-gray-600" />
                  <div className="font-semibold">{selectedProperty.baths}</div>
                  <div className="text-sm text-gray-600">Bathrooms</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Square className="w-6 h-6 mx-auto mb-1 text-gray-600" />
                  <div className="font-semibold">{selectedProperty.sqft}</div>
                  <div className="text-sm text-gray-600">Sq Ft</div>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Location Features</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Interactive property mapping</li>
                <li>• Location-based search</li>
                <li>• Neighborhood insights</li>
                <li>• Real-time property data</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}