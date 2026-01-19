'use client'

import { GeocodeCommand, GeocodeCommandInput, GeocodeCommandOutput } from '@aws-sdk/client-geo-places'
import { GeoPlaces } from '@chaosity/location-client'
import { useLocationClient } from '@chaosity/location-client-react'
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder'
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css'
import { filter } from 'framer-motion/client'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export default function MapDemoAWSGeocoder() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const marker = useRef<maplibregl.Marker | null>(null)
  const popup = useRef<maplibregl.Popup | null>(null)
  const geocoderRef = useRef<MaplibreGeocoder | null>(null)
  const colorSchemeSelectRef = useRef<HTMLSelectElement>(null)
  const politicalViewSelectRef = useRef<HTMLSelectElement>(null)
  const prevFilterCountryRef = useRef<string>('')
  const prevPoliticalViewRef = useRef<string>('')
  const { config, client, loading: clientLoading, error: clientError } = useLocationClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapStyle, setMapStyle] = useState('Standard')
  const [colorScheme, setColorScheme] = useState('Light')
  const [politicalView, setPoliticalView] = useState('')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [filterCountry, setFilterCountry] = useState<string>('')
  const [language, setLanguage] = useState<string>('en')

  useEffect(() => {
    console.log('[MapDemo] Attempting to get user geolocation...')
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.longitude, position.coords.latitude])
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            console.log('[MapDemo] Geolocation permission denied')
          }
        }
      )
    }
  }, [])

  function useDependencyDebugger(dependencies: any[], dependencyNames: string[]) {
    const previousDeps = useRef<any[]>([])

    useEffect(() => {
      dependencies.forEach((dep, i) => {
        if (previousDeps.current[i] !== dep) {
          console.log(`[Dependency Changed] ${dependencyNames[i]}:`, {
            previous: previousDeps.current[i],
            current: dep
          })
        }
      })
      previousDeps.current = dependencies
    })
  }

  // Usage in your component:
  useDependencyDebugger(
    [clientLoading, config, client, clientError, colorScheme, politicalView, mapStyle, userLocation],
    ['clientLoading', 'config', 'client', 'clientError', 'colorScheme', 'politicalView', 'mapStyle', 'userLocation']
  )

  const recurseExpression = useCallback((exp: any, prevPropertyRegex: RegExp, nextProperty: string): any => {
    if (!Array.isArray(exp)) return exp;
    if (exp[0] !== 'coalesce') return exp.map((v: any) =>
      recurseExpression(v, prevPropertyRegex, nextProperty)
    );

    const first = exp[1];
    const second = exp[2];

    let isMatch =
      Array.isArray(first) &&
      first[0] === 'get' &&
      !!first[1].match(prevPropertyRegex)?.[0];

    isMatch = isMatch && Array.isArray(second) && second[0] === 'get';
    isMatch = isMatch && !exp?.[4];

    if (!isMatch) return exp.map((v: any) =>
      recurseExpression(v, prevPropertyRegex, nextProperty)
    );

    return [
      'coalesce',
      ['get', nextProperty],
      ['get', 'name:en'],
      ['get', 'name']
    ];
  }, []);

  const updateLayer = useCallback((layer: any, prevPropertyRegex: RegExp, nextProperty: string) => {
    return {
      ...layer,
      layout: {
        ...layer.layout,
        'text-field': recurseExpression(
          layer.layout['text-field'],
          prevPropertyRegex,
          nextProperty
        )
      }
    };
  }, [recurseExpression]);

  const setPreferredLanguage = useCallback((style: any, language: string) => {
    const nextStyle = { ...style };
    console.log('[Language] Setting language to:', language);
    let updatedCount = 0;
    nextStyle.layers = nextStyle.layers.map((l: any) => {
      if (l.type !== 'symbol' || !l?.layout?.['text-field']) return l;
      const updated = updateLayer(l, /^name:([A-Za-z\-\_]+)$/g, `name:${language}`);
      if (JSON.stringify(l.layout['text-field']) !== JSON.stringify(updated.layout['text-field'])) {
        updatedCount++;
      }
      return updated;
    });
    console.log('[Language] Updated', updatedCount, 'layers');
    return nextStyle;
  }, [updateLayer]);


  const getStyleWithPreferredLanguage = useCallback(async (styleUrl: string, language: string) => {
    const res = await fetch(styleUrl, {
      headers: {
        'Authorization': `Bearer ${config?.token}`,
        'Accept': 'application/json'
      }
    })
    const style = await res.json()
    return setPreferredLanguage(style, language)
  }, [config, setPreferredLanguage])

  useEffect(() => {

    console.log('[MapDemo] Initializing map...')
    if (!mapContainer.current || map.current) return
    console.log('[MapDemo] Map container found, proceeding with initialization...')
    async function initMap() {
      if (clientLoading || !config || !client) return
      if (clientError) {
        setError(clientError)
        setLoading(false)
        return
      }

      try {

        const defaultColorScheme = 'Light';
        const defaultMapStyle = 'Standard';
        const params = new URLSearchParams({
          'color-scheme': defaultColorScheme,
          'terrain': 'Hillshade',
        })
        const styleUrl = `${config.apiUrl}/maps/${defaultMapStyle}/descriptor?${params.toString()}`

        // const location = locations['current-location'] || locations['sydney'];
        const mapInstance = new maplibregl.Map({
          container: mapContainer.current!,
          style: styleUrl,
          // center: location.center,
          // zoom: location.zoom,
          maplibreLogo: true,

          minZoom: 3,
          transformRequest: (url) => {
            if (url.startsWith(config.apiUrl)) {
              const headers: Record<string, string> = {
                'Authorization': `Bearer ${config.token}`,
              }

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
        mapInstance.addControl(new maplibregl.NavigationControl({
          showCompass: true,
          showZoom: true,
          visualizePitch: true,
          visualizeRoll: true
        }), 'top-right');

        mapInstance.addControl(new maplibregl.GeolocateControl({
          showUserLocation: true,
          trackUserLocation: true,
          positionOptions: {
            enableHighAccuracy: true
          }

        }));

        mapInstance.addControl(new maplibregl.ScaleControl({
          maxWidth: 100,
          unit: 'metric'
        }));

        // mapInstance.addControl(new maplibregl.TerrainControl({
        //   source: 'aws',
        //   exaggeration: 10.5
        // }));

        mapInstance.addControl(new maplibregl.GlobeControl());

        const geoPlaces = new GeoPlaces(client, mapInstance)

        const geocoder = new MaplibreGeocoder(geoPlaces, {
          maplibregl: maplibregl,
          placeholder: 'Search for places',
          showResultsWhileTyping: true,
          minLength: 3,
          marker: true,
          popup: true,

          trackProximity: true,
          enableEventLogging: true,
          limit: 5,
          flyTo: {
            speed: 1.5,
          },

        })

        geocoderRef.current = geocoder
        mapInstance.addControl(geocoder, 'top-left')

        mapInstance.on('style.load', () => {
          mapInstance.setProjection({
            type: 'globe', // Set projection to globe
          });
        })

        // mapInstance.on('load', () => {
        //   mapInstance.setCenter
        // })

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
      if (marker.current) {
        marker.current.remove()
        marker.current = null
      }
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [clientLoading, config, client, clientError])



  const flyToCountryCenter = useCallback(async (countryCode: string) => {
      if (clientLoading || !config || !client) return
      if (clientError) {
        setError(clientError)
        setLoading(false)
        return
      }

      if (geocoderRef.current && countryCode) {
        const commandInput: GeocodeCommandInput = {
          QueryComponents: {
            Country: countryCode,
          }
        }
        const command = new GeocodeCommand(commandInput)
        const response: GeocodeCommandOutput = await client.send(command)

        if (response.ResultItems && response.ResultItems.length > 0) {
          const countryGeocode = response.ResultItems.find(item => {
            return item.PlaceType?.includes('Country')
          })

          if (countryGeocode) {
            map.current?.flyTo({
              center: countryGeocode.Position as [number, number],
              speed: 1.2,
              curve: 1.4,
            })
            map.current?.fitBounds(countryGeocode.MapView as [number, number, number, number], {
              padding: 20
            })
          }
        }
      }
    }, [clientLoading, config, client, clientError])

  useEffect(() => {
    const filterCountryChanged = prevFilterCountryRef.current !== filterCountry
    const politicalViewChanged = prevPoliticalViewRef.current !== politicalView

    if (filterCountryChanged && filterCountry) {
      flyToCountryCenter(filterCountry)
      if (geocoderRef.current) {
        geocoderRef.current.setCountries(filterCountry)
      }
    } else if (politicalViewChanged && politicalView) {
      flyToCountryCenter(politicalView)
    }

    prevFilterCountryRef.current = filterCountry
    prevPoliticalViewRef.current = politicalView

    if (geocoderRef.current && language) {
      geocoderRef.current.setLanguage(language)
    }
  }, [filterCountry, politicalView, language, flyToCountryCenter])

  useEffect(() => {

    const isRasterStyle = mapStyle === 'Satellite' || mapStyle === 'Hybrid'

    if (colorSchemeSelectRef.current) {
      colorSchemeSelectRef.current.disabled = isRasterStyle || loading
      if (isRasterStyle) {
        setColorScheme('Light')
      }
    }

    if (politicalViewSelectRef.current) {
      politicalViewSelectRef.current.disabled = mapStyle === 'Satellite' || loading
      if (mapStyle === 'Satellite') {
        setPoliticalView('')
      }
    }

    if (map.current && config) {

      const params = new URLSearchParams({
        'color-scheme': colorScheme,
        ...(politicalView && { 'political-view': politicalView })
      })

      const styleUrl = `${config.apiUrl}/maps/${mapStyle}/descriptor?${params.toString()}`
      const setStyle = async (styleUrl: string, language: string) => {
        try {
          const style = await getStyleWithPreferredLanguage(styleUrl, language);
          map.current?.setStyle(style);
        } catch (error) {
          console.error('Failed to set map style:', error);
        }
      }

      setStyle(styleUrl, language);
    }
  }, [mapStyle, colorScheme, politicalView, config, language, getStyleWithPreferredLanguage, loading])


  if (error) {
    return (
      <div className="w-full h-150 bg-red-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Failed to load map</p>
          <p className="text-red-500 text-sm mt-2">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        {/* Row 1: Map Style, Color Scheme, Political View */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color Scheme
            </label>
            <select
              ref={colorSchemeSelectRef}
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="Light">Light</option>
              <option value="Dark">Dark</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Political View
            </label>
            <select
              ref={politicalViewSelectRef}
              value={politicalView}
              onChange={(e) => setPoliticalView(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Default</option>
              <option value="IND">India</option>
              <option value="ARG">Argentina</option>
              <option value="EGY">Egypt</option>
              <option value="MAR">Morocco</option>
              <option value="RUS">Russia</option>
              <option value="SDN">Sudan</option>
              <option value="SRB">Serbia</option>
              <option value="SYR">Syria</option>
              <option value="TUR">Turkey</option>
            </select>
          </div>
        </div>

        {/* Row 2: Country Filter, Language */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country Filter
            </label>
            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">All Countries</option>
              <option value="CA">Canada</option>
              <option value="US">USA</option>
              <option value="GB">UK</option>
              <option value="JP">Japan</option>
              <option value="AU">Australia</option>
              <option value="FR">France</option>
              <option value="DE">Germany</option>
              <option value="IN">India</option>
              <option value="BR">Brazil</option>
              <option value="MX">Mexico</option>
              <option value="IT">Italy</option>
              <option value="ES">Spain</option>
              <option value="CN">China</option>
              <option value="KR">South Korea</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="ja">Japanese</option>
              <option value="zh">Chinese</option>
              <option value="ar">Arabic</option>
              <option value="pt">Portuguese</option>
              <option value="ru">Russian</option>
              <option value="hi">Hindi</option>
              <option value="ko">Korean</option>
              <option value="it">Italian</option>
            </select>
          </div>
        </div>
      </div>

      <div className="relative w-full h-150 bg-white rounded-lg shadow-lg overflow-hidden">
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
