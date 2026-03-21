'use client'

import { useState, useEffect } from 'react'
import { ShoppingCartIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useLocationClient } from '@chaosity/location-client-react'
import { EcommerceClient } from '@/lib/adapters/EcommerceClient'

const COUNTRIES = [
  { name: 'United States', code: 'USA', coords: { lng: -122.0842499, lat: 37.4224764 } },
  { name: 'United Kingdom', code: 'GBR', coords: { lng: -1.5528, lat: 53.8008 } },
  { name: 'Germany', code: 'DEU', coords: { lng: 10.4515, lat: 51.1657 } },
  { name: 'France', code: 'FRA', coords: { lng: 2.2137, lat: 46.2276 } },
  { name: 'Canada', code: 'CAN', coords: { lng: -106.3468, lat: 56.1304 } },
  { name: 'Australia', code: 'AUS', coords: { lng: 133.7751, lat: -25.2744 } },
  { name: 'Japan', code: 'JPN', coords: { lng: 138.2529, lat: 36.2048 } },
  { name: 'Spain', code: 'ESP', coords: { lng: -3.7492, lat: 40.4637 } },
  { name: 'Italy', code: 'ITA', coords: { lng: 12.5674, lat: 41.8719 } },
  { name: 'Netherlands', code: 'NLD', coords: { lng: 5.2913, lat: 52.1326 } },
  { name: 'Brazil', code: 'BRA', coords: { lng: -47.8825, lat: -15.7942 } },
  { name: 'Mexico', code: 'MEX', coords: { lng: -102.5528, lat: 23.6345 } },
  { name: 'India', code: 'IND', coords: { lng: 78.9629, lat: 20.5937 } },
  { name: 'South Korea', code: 'KOR', coords: { lng: 127.7669, lat: 35.9078 } },
]

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'hi', name: 'Hindi' },
]

export default function EcommerceDemo() {
  const { config, client, loading: clientLoading, error: clientError } = useLocationClient()
  const [selectedCountry, setSelectedCountry] = useState<typeof COUNTRIES[0] | null>(null)
  const [language, setLanguage] = useState('en')
  const [ecommerceClient, setEcommerceClient] = useState<EcommerceClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locationDetected, setLocationDetected] = useState(false)
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  interface SuggestionItem {
    Address?: { Label?: string; Municipality?: string; PostalCode?: string }
  }
  interface ValidationResult {
    isValid: boolean
    formatted_address?: string
    details?: { PostalCode?: string }
  }
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [deliveryOption, setDeliveryOption] = useState<'standard' | 'express' | 'pickup'>('standard')
  const [cartItems] = useState([
    { name: 'Wireless Headphones', price: 99.99, qty: 1 },
    { name: 'Phone Case', price: 24.99, qty: 2 }
  ])

  useEffect(() => {
    if (!locationDetected && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          const nearest = COUNTRIES.reduce((prev, curr) => {
            const prevDist = Math.hypot(prev.coords.lng - longitude, prev.coords.lat - latitude)
            const currDist = Math.hypot(curr.coords.lng - longitude, curr.coords.lat - latitude)
            return currDist < prevDist ? curr : prev
          })
          setSelectedCountry(nearest)
          setLocationDetected(true)
        },
        () => {
          setSelectedCountry(COUNTRIES[0])
          setLocationDetected(true)
        }
      )
    } else if (!locationDetected) {
      setSelectedCountry(COUNTRIES[0])
      setLocationDetected(true)
    }
  }, [locationDetected])

  useEffect(() => {
    if (clientLoading || !client || !selectedCountry) return
    if (clientError) {
      setError(clientError)
      setLoading(false)
      return
    }

    setEcommerceClient(new EcommerceClient(client, [selectedCountry.coords.lng, selectedCountry.coords.lat], language, selectedCountry.code))
  }, [client, selectedCountry, language, setError, clientLoading, clientError])

  const handleAddressChange = async (value: string) => {
    setAddress(value)
    if (value.length > 3 && ecommerceClient) {
      const response = await ecommerceClient.getSuggestions(value)
      const items = ((response as { ResultItems?: SuggestionItem[] }).ResultItems) || []
      setSuggestions(items.filter((item) => item.Address))
    } else {
      setSuggestions([])
    }
  }

  const handleValidation = async () => {
    if (!address || !ecommerceClient) return

    setIsValidating(true)
    try {
      const response = await ecommerceClient.getSuggestions(address)
      const items = ((response as { ResultItems?: SuggestionItem[] }).ResultItems) || []
      const firstAddress = items.find((item) => item.Address)?.Address

      if (firstAddress) {
        setValidation({
          isValid: true,
          formatted_address: firstAddress.Label || ''
        })
      } else {
        setValidation({ isValid: false })
      }
    } catch (error) {
      setValidation({ isValid: false })
    }
    setIsValidating(false)
    setSuggestions([])
  }

  const selectSuggestion = (item: SuggestionItem) => {
    const address = item.Address
    setAddress(address?.Label || '')
    setCity(address?.Municipality || '')
    setPostalCode(address?.PostalCode || '')
    setSuggestions([])
    setValidation({
      isValid: true,
      formatted_address: address?.Label || '',
      details: address
    })
  }

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const shipping = deliveryOption === 'express' ? 15.99 : deliveryOption === 'standard' ? 5.99 : 0
  const total = subtotal + shipping

  return (
    <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
      {/* Shopping Cart */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <ShoppingCartIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Your Cart</h2>
        </div>

        <div className="space-y-4 mb-6">
          {cartItems.map((item, index) => (
            <div key={index} className="flex justify-between items-center py-3 border-b">
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-gray-600">Qty: {item.qty}</div>
              </div>
              <div className="font-semibold">${(item.price * item.qty).toFixed(2)}</div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Shipping:</span>
            <span>${shipping.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-xl font-bold border-t pt-2">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Address Form */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Shipping Address</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <select
                value={selectedCountry?.name || ''}
                onChange={(e) => setSelectedCountry(COUNTRIES.find(c => c.name === e.target.value)!)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!selectedCountry}
              >
                {COUNTRIES.map((country) => (
                  <option key={country.name} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Option *
            </label>
            <div className="space-y-2">
              {[
                { value: 'standard', label: 'Standard (5-7 days)', price: 5.99 },
                { value: 'express', label: 'Express (2-3 days)', price: 15.99 },
                { value: 'pickup', label: 'Store Pickup (Free)', price: 0 },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="delivery"
                    value={option.value}
                    checked={deliveryOption === option.value}
                    onChange={(e) => setDeliveryOption(e.target.value as 'standard' | 'express' | 'pickup')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-gray-600">${option.price.toFixed(2)}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {deliveryOption !== 'pickup' && (
            <>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
            <input
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              onBlur={handleValidation}
              placeholder="Start typing your address..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

                {/* Autocomplete Suggestions */}
                {suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => selectSuggestion(item)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <div className="font-medium">{item.Address?.Label || ''}</div>
                        {item.Address?.Municipality && (
                          <div className="text-sm text-gray-600">{item.Address.Municipality}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="Postal Code"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </>
          )}

          {deliveryOption !== 'pickup' && validation && (
            <div className={`p-4 rounded-lg border ${validation.isValid
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
              }`}>
              <div className="flex items-center gap-2 mb-2">
                {validation.isValid ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircleIcon className="w-5 h-5 text-red-600" />
                )}
                <span className={`font-medium ${validation.isValid ? 'text-green-800' : 'text-red-800'
                  }`}>
                  {validation.isValid ? 'Address Verified ✓' : 'Address Invalid'}
                </span>
              </div>

              {validation.isValid && validation.details && (
                <div className="text-sm text-green-700 space-y-1">
                  <div><span className="font-medium">Address:</span> {validation.formatted_address}</div>
                  {validation.details.PostalCode && (
                    <div><span className="font-medium">Postal Code:</span> {validation.details.PostalCode}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {deliveryOption === 'pickup' && (
            <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">Store Pickup Selected</span>
              </div>
              <div className="text-sm text-blue-700">
                <div className="font-medium">Pickup Location:</div>
                <div>123 Main Street, {selectedCountry?.name}</div>
                <div className="mt-2 text-xs">Ready for pickup in 2-4 hours</div>
              </div>
            </div>
          )}

          <button
            disabled={deliveryOption !== 'pickup' && !validation?.isValid}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:bg-gray-400"
          >
            Complete Order - ${total.toFixed(2)}
          </button>
        </div>

        {/* Demo Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-800">Demo Benefits</span>
          </div>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Reduces failed deliveries by 85%</li>
            <li>• Saves $12 per failed delivery</li>
            <li>• Improves customer satisfaction</li>
            <li>• Real-time address validation</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
