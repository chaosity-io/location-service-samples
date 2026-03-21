import {
  AutocompleteCommand,
  AutocompleteCommandInput,
  AutocompleteCommandOutput,
  AutocompleteResultItem,
  createTransformRequest,
  GeocodeCommand,
  GeocodeCommandInput,
  GeocodeCommandOutput,
  GetPlaceCommand,
  GetPlaceCommandOutput,
  ReverseGeocodeCommand,
  ReverseGeocodeCommandOutput,
} from '@chaosity/location-client'
import { useLocationClient } from '@chaosity/location-client-react'
import MapLibreGL, {
  Camera,
  MapView,
  PointAnnotation,
} from '@maplibre/maplibre-react-native'
import * as Location from 'expo-location'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

const API_URL = process.env.EXPO_PUBLIC_LOCATION_API_URL!

// Required: call once before using any map features
MapLibreGL.setAccessToken(null)

interface AddressResult {
  placeId?: string
  label?: string
  addressLineOne?: string
  city?: string
  province?: string
  postalCode?: string
  country?: string
  position?: [number, number]
}

export default function AddressFinder() {
  const cameraRef = useRef<Camera>(null)
  const {
    client,
    getToken,
    loading: clientLoading,
    error: clientError,
  } = useLocationClient()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AutocompleteResultItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<AddressResult | null>(
    null,
  )
  const [isValidating, setIsValidating] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([-98.5, 39.8])
  const [searchMode, setSearchMode] = useState<'autocomplete' | 'geocode'>(
    'autocomplete',
  )
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const styleUrl = `${API_URL}/maps/Standard/descriptor?color-scheme=Light&terrain=Hillshade`

  const searchAddress = useCallback(
    (searchQuery: string) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      if (!client || !searchQuery || searchQuery.length < 3) {
        setSuggestions([])
        return
      }

      debounceTimer.current = setTimeout(async () => {
        try {
          if (searchMode === 'geocode') {
            const commandInput: GeocodeCommandInput = {
              QueryText: searchQuery,
              BiasPosition: mapCenter,
              MaxResults: 5,
              Language: 'en',
            }
            const command = new GeocodeCommand(commandInput)
            const response: GeocodeCommandOutput = await client.send(command)
            const results: AutocompleteResultItem[] = (
              response.ResultItems || []
            ).map((item) => ({
              Title: item.Address?.Label || '',
              Address: item.Address,
              PlaceId: item.PlaceId,
              PlaceType: 'Street' as const,
            }))
            setSuggestions(results)
            setShowSuggestions(true)
          } else {
            const commandInput: AutocompleteCommandInput = {
              QueryText: searchQuery,
              MaxResults: 5,
              Language: 'en',
              BiasPosition: mapCenter,
            }
            const command = new AutocompleteCommand(commandInput)
            const response: AutocompleteCommandOutput =
              await client.send(command)
            setSuggestions(response.ResultItems || [])
            setShowSuggestions(true)
          }
        } catch (err) {
          console.error('Search error:', err)
        }
      }, 600)
    },
    [client, searchMode, mapCenter],
  )

  // Re-search when mode switches
  useEffect(() => {
    if (query.length >= 3) searchAddress(query)
  }, [searchAddress])

  const selectAddress = useCallback(
    async (suggestion: AutocompleteResultItem) => {
      if (!client || !suggestion.PlaceId) return
      setIsValidating(true)
      setShowSuggestions(false)
      try {
        const command = new GetPlaceCommand({
          PlaceId: suggestion.PlaceId,
          Language: 'en',
        })
        const response: GetPlaceCommandOutput = await client.send(command)
        const address: AddressResult = {
          placeId: suggestion.PlaceId,
          label: response.Address?.Label,
          addressLineOne: response.Address?.AddressNumber
            ? `${response.Address.AddressNumber} ${response.Address.Street || ''}`.trim()
            : response.Address?.Street,
          city: response.Address?.Locality,
          province: response.Address?.Region?.Name,
          postalCode: response.Address?.PostalCode,
          country:
            response.Address?.Country?.Code3 ??
            response.Address?.Country?.Name ??
            undefined,
          position: response.Position as [number, number],
        }
        setSelectedAddress(address)
        setQuery(response.Address?.Label || '')
        if (response.Position) {
          const pos = response.Position as [number, number]
          setMapCenter(pos)
          cameraRef.current?.flyTo(pos, 800)
        }
      } catch (err) {
        console.error('GetPlace error:', err)
      } finally {
        setIsValidating(false)
      }
    },
    [client],
  )

  const useCurrentLocation = useCallback(async () => {
    if (!client) return
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })
      const { longitude, latitude } = location.coords

      const command = new ReverseGeocodeCommand({
        QueryPosition: [longitude, latitude],
        Language: 'en',
      })
      const response: ReverseGeocodeCommandOutput = await client.send(command)
      const result = response.ResultItems?.[0]

      if (result) {
        const address: AddressResult = {
          label: result.Address?.Label,
          addressLineOne: result.Address?.AddressNumber
            ? `${result.Address.AddressNumber} ${result.Address.Street || ''}`.trim()
            : result.Address?.Street,
          city: result.Address?.Locality,
          province: result.Address?.Region?.Name,
          postalCode: result.Address?.PostalCode,
          country:
            result.Address?.Country?.Code3 ??
            result.Address?.Country?.Name ??
            undefined,
          position: [longitude, latitude],
        }
        setSelectedAddress(address)
        setQuery(result.Address?.Label || '')
        const pos: [number, number] = [longitude, latitude]
        setMapCenter(pos)
        cameraRef.current?.flyTo(pos, 800)
      }
    } catch (err) {
      console.error('Geolocation error:', err)
    }
  }, [client])

  if (clientLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Connecting…</Text>
      </View>
    )
  }

  if (clientError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Failed to connect</Text>
        <Text style={styles.errorText}>{clientError}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Search panel */}
      <View style={styles.panel}>
        {/* Mode toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            onPress={() => setSearchMode('autocomplete')}
            style={[
              styles.modeBtn,
              searchMode === 'autocomplete' && styles.modeBtnActive,
            ]}
          >
            <Text
              style={[
                styles.modeBtnText,
                searchMode === 'autocomplete' && styles.modeBtnTextActive,
              ]}
            >
              Autocomplete
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSearchMode('geocode')}
            style={[
              styles.modeBtn,
              searchMode === 'geocode' && styles.modeBtnActive,
            ]}
          >
            <Text
              style={[
                styles.modeBtnText,
                searchMode === 'geocode' && styles.modeBtnTextActive,
              ]}
            >
              Geocode
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search input row */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={(text) => {
              setQuery(text)
              searchAddress(text)
            }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={
              searchMode === 'geocode'
                ? 'Enter full address (e.g. 123 Main St, City)…'
                : 'Enter an address…'
            }
            placeholderTextColor="#9ca3af"
            autoCorrect={false}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.locationBtn}
            onPress={useCurrentLocation}
          >
            <Text style={styles.locationBtnText}>📍</Text>
          </TouchableOpacity>
        </View>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.dropdown}>
            <FlatList
              data={suggestions}
              keyExtractor={(_, i) => String(i)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => selectAddress(item)}
                >
                  <Text style={styles.suggestionTitle}>{item.Title}</Text>
                  {item.Address?.Label && (
                    <Text style={styles.suggestionLabel}>
                      {item.Address.Label}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Validating spinner */}
        {isValidating && (
          <View style={styles.validatingRow}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.validatingText}>Resolving address…</Text>
          </View>
        )}

        {/* Selected address card */}
        {selectedAddress && !isValidating && (
          <View style={styles.addressCard}>
            <Text style={styles.addressCardTitle}>✓ Address resolved</Text>
            <View style={styles.addressGrid}>
              {selectedAddress.addressLineOne ? (
                <View style={styles.addressField}>
                  <Text style={styles.fieldLabel}>Street</Text>
                  <Text style={styles.fieldValue}>
                    {selectedAddress.addressLineOne}
                  </Text>
                </View>
              ) : null}
              {selectedAddress.city ? (
                <View style={styles.addressField}>
                  <Text style={styles.fieldLabel}>City</Text>
                  <Text style={styles.fieldValue}>{selectedAddress.city}</Text>
                </View>
              ) : null}
              {selectedAddress.province ? (
                <View style={styles.addressField}>
                  <Text style={styles.fieldLabel}>State / Province</Text>
                  <Text style={styles.fieldValue}>
                    {selectedAddress.province}
                  </Text>
                </View>
              ) : null}
              {selectedAddress.postalCode ? (
                <View style={styles.addressField}>
                  <Text style={styles.fieldLabel}>Postal Code</Text>
                  <Text style={styles.fieldValue}>
                    {selectedAddress.postalCode}
                  </Text>
                </View>
              ) : null}
              {selectedAddress.country ? (
                <View style={styles.addressField}>
                  <Text style={styles.fieldLabel}>Country</Text>
                  <Text style={styles.fieldValue}>
                    {selectedAddress.country}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {getToken && (
          <MapView
            style={styles.map}
            styleURL={styleUrl}
            transformRequest={createTransformRequest(API_URL, getToken)}
          >
            <Camera
              ref={cameraRef}
              centerCoordinate={mapCenter}
              zoomLevel={selectedAddress ? 14 : 4}
              animationMode="flyTo"
              animationDuration={800}
            />
            {selectedAddress?.position && (
              <PointAnnotation
                id="selected"
                coordinate={selectedAddress.position}
              >
                <View style={styles.markerDot} />
              </PointAnnotation>
            )}
          </MapView>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  errorTitle: { fontSize: 16, fontWeight: '600', color: '#dc2626' },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: '#ef4444',
    textAlign: 'center',
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  modeBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: '#2563eb' },
  modeBtnText: { fontSize: 12, fontWeight: '500', color: '#374151' },
  modeBtnTextActive: { color: '#fff' },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    height: 42,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  locationBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationBtnText: { fontSize: 18 },
  dropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fff',
    maxHeight: 200,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionTitle: { fontSize: 14, fontWeight: '500', color: '#111827' },
  suggestionLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  validatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  validatingText: { fontSize: 13, color: '#6b7280' },
  addressCard: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  addressCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 8,
  },
  addressGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addressField: { minWidth: '45%' },
  fieldLabel: { fontSize: 11, fontWeight: '500', color: '#374151' },
  fieldValue: { fontSize: 13, color: '#111827', marginTop: 1 },
  mapContainer: {
    flex: 1,
    margin: 12,
    marginTop: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: { flex: 1 },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: '#fff',
  },
})
