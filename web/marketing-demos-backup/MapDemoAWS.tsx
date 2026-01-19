'use client'

import { useLocationClient } from '@chaosity/location-client-react'
import { GeoPlaces } from '@/lib/utils/geo-places'
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder'
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'

export default function MapDemoAWS() {
  const { config } = useLocationClient()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapStyle, setMapStyle] = useState('Standard')
  const [colorScheme, setColorScheme] = useState('Light')
  const [politicalView, setPoliticalView] = useState('')
  const [location, setLocation] = useState('vancouver')
  const tokenRef = useRef<string>('')
  const apiUrlRef = useRef<string>('')

  const locations: Record<string, { center: [number, number]; zoom: number }> = {
    vancouver: { center: [-123.116226, 49.246292], zoom: 10 },
    'new-york': { center: [-74.006, 40.7128], zoom: 11 },
    london: { center: [-0.1276, 51.5074], zoom: 11 },
    tokyo: { center: [139.6917, 35.6895], zoom: 11 },
    sydney: { center: [151.2093, -33.8688], zoom: 11 },
    paris: { center: [2.3522, 48.8566], zoom: 11 },
    world: { center: [0, 20], zoom: 2 },
  }

  useEffect(() => {
    if (!mapContainer.current || map.current || !config) return

    async function initMap() {
      try {
        if (!config.token || !config.apiUrl) {
          throw new Error('Missing authentication configuration')
        }

        tokenRef.current = config.token
        apiUrlRef.current = config.apiUrl

        const params = new URLSearchParams({
          'color-scheme': colorScheme,
          ...(politicalView && { 'political-view': politicalView })
        })
        const styleUrl = `${apiUrl}/maps/${mapStyle}/descriptor?${params.toString()}`

        const mapInstance = new maplibregl.Map({
          container: mapContainer.current!,
          style: styleUrl,
          center: locations[location].center,
          zoom: locations[location].zoom,
          transformRequest: (url) => {
            if (url.startsWith(config.apiUrl)) {
              const headers: Record<string, string> = {
                'Authorization': `Bearer ${config.token}`,
              }

              // Set correct Accept header based on resource type
              if (url.includes('/tiles/')) {
                headers['Accept'] = 'application/x-protobuf'
              } else if (url.includes('/glyphs/')) {
                headers['Accept'] = 'application/x-protobuf'
              } else if (url.includes('/sprites/') && url.endsWith('.png')) {
                headers['Accept'] = 'image/png'
              } else if (url.includes('/sprites/') && url.endsWith('.json')) {
                headers['Accept'] = 'application/json'
              } else if (url.includes('/descriptor')) {
                headers['Accept'] = 'application/json'
              }

              return { url, headers }
            }
            return { url }
          },
        })

        mapInstance.addControl(new maplibregl.NavigationControl(), 'top-right')

        const geoPlaces = new GeoPlaces(config.apiUrl, config.token, mapInstance)

        addSearchBox(mapInstance, geoPlaces);

        addMapClick(mapInstance, geoPlaces);


        function addSearchBox(map, geoPlaces) {
          const searchBox = new MaplibreGeocoder(geoPlaces, {
            maplibregl,
            showResultsWhileTyping: true, // Show results while typing
            debounceSearch: 300, // Debounce search requests
            limit: 30, // Limit number of results
            popuprender: renderPopup, // Function to render popup
            reverseGeocode: false, // Enable reverse geocoding
            zoom: 14, // Zoom level on result selection
            placeholder: "Search text or nearby (lat,long)"
          });
          map.addControl(searchBox, 'top-left'); // Add the search box to the map

          // Event listener for when a search result is selected
          searchBox.on('result', async (event) => {
            try {
              const { id, result_type } = event.result; // Get result ID and type
              if (result_type === "Place") { // Check if the result is a place
                const placeResults = await geoPlaces.searchByPlaceId(id); // Fetch details for the selected place
                console.log('Place details:', placeResults);
                if (placeResults.features.length) {
                  createPopup(placeResults.features[0]).addTo(map); // Create and add popup for the place
                }
              }
            } catch (error) {
              console.error('Error fetching place details:', error);
            }
          });
        }

        function renderPopup(feature) {
          return `
                <div class="popup-content">
                    <span class="${feature.place_type.toLowerCase()} badge">${feature.place_type}</span><br>
                    ${feature.place_name}
                </div>`;
        }

        function createPopup(feature) {
          console.log('Creating popup for feature:', feature);
          return new maplibregl.Popup({ offset: 30 }) // Create a new popup
            .setLngLat(feature.geometry.coordinates) // Set the popup position
            .setHTML(renderPopup(feature)); // Set the popup content
        }


        function addMapClick(map, geoPlaces) {
          map.on('click', async ({ lngLat }) => { // Listen for click events on the map
            const response = await geoPlaces.reverseGeocode({ query: [lngLat.lng, lngLat.lat], limit: 1, click: true }); // Perform reverse geocoding

            if (response.features.length) { // If there are results
              const clickMarker = new maplibregl.Marker({ color: "orange" }); // Create a marker
              const feature = response.features[0]; // Get the clicked feature
              const clickedPopup = createPopup(feature); // Create popup for the clicked feature
              console.log('Clicked feature:', feature);
              console.log('Clicked feature.geometry:', feature.geometry);
              clickMarker.setLngLat(feature.geometry.coordinates) // Set marker position
                .setPopup(clickedPopup) // Attach popup to marker
                .addTo(map); // Add marker to the map

              clickedPopup.addTo(map); // Add popup to map
              clickedPopup.on('close', () => clickMarker.remove()); // Remove marker when popup is closed
            }
          });
        }

        setLoading(false)
        map.current = mapInstance
      } catch (err) {
        console.error('Map initialization error:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize map')
        setLoading(false)
      }
    }

    initMap()

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [config])

  // Update map style when options change
  useEffect(() => {
    if (map.current && tokenRef.current && apiUrlRef.current) {
      const params = new URLSearchParams({
        'color-scheme': colorScheme,
        ...(politicalView && { 'political-view': politicalView })
      })
      const styleUrl = `${apiUrlRef.current}/maps/${mapStyle}/descriptor?${params.toString()}`
      map.current.setStyle(styleUrl)
    }
  }, [mapStyle, colorScheme, politicalView])

  if (error) {
    return (
      <div className="w-full h-[600px] bg-red-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Failed to load map</p>
          <p className="text-red-500 text-sm mt-2">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Map Style Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Map Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Map Style
            </label>
            <select
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="Standard">Standard</option>
              <option value="Monochrome">Monochrome</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Satellite">Satellite</option>
            </select>
          </div>

          {/* Color Scheme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color Scheme
            </label>
            <select
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="Light">Light</option>
              <option value="Dark">Dark</option>
            </select>
          </div>

          {/* Political View */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Political View
            </label>
            <select
              value={politicalView}
              onChange={(e) => setPoliticalView(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Default</option>
              <option value="IND">India</option>
              <option value="ARG">Argentina</option>
              <option value="EGY">Egypt</option>
              <option value="MAR">Morocco</option>
              <option value="PAK">Pakistan</option>
              <option value="RUS">Russia</option>
              <option value="SDN">Sudan</option>
              <option value="SRB">Serbia</option>
              <option value="SYR">Syria</option>
              <option value="TUR">Turkey</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <select
              value={location}
              onChange={(e) => {
                const loc = e.target.value
                setLocation(loc)
                if (map.current) {
                  map.current.flyTo({
                    center: locations[loc].center,
                    zoom: locations[loc].zoom,
                    duration: 2000
                  })
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="vancouver">Vancouver</option>
              <option value="new-york">New York</option>
              <option value="london">London</option>
              <option value="tokyo">Tokyo</option>
              <option value="sydney">Sydney</option>
              <option value="paris">Paris</option>
              <option value="world">World View</option>
            </select>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[600px] bg-white rounded-lg shadow-lg overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
        <div ref={mapContainer} className="w-full h-full" />
      </div>
    </div>
  )
}
