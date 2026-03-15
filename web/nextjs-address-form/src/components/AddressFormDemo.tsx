'use client'

import { useState } from 'react'
import { AddressForm, type AddressFormData, type SubmitHandler } from '@chaosity/address-form'
import '@chaosity/address-form/dist/lib/address-form.css'

export function AddressFormDemo() {
  const [submittedData, setSubmittedData] = useState<AddressFormData | null>(null)

  const handleSubmit: SubmitHandler = async (getData) => {
    const data = await getData({ intendedUse: 'SingleUse' })
    setSubmittedData(data)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-gray-900">Address Form Demo</h1>
          <p className="text-sm text-gray-500">
            Using <code className="bg-gray-100 px-1 rounded">@chaosity/address-form</code> with autocomplete
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Enter your address
          </h2>

          <AddressForm onSubmit={handleSubmit} allowedCountries={['US', 'CA', 'AU', 'GB']}>
            <div className="space-y-3">
              <AddressForm.AddressField
                name="addressLineOne"
                label="Address"
                placeholder="Start typing your address..."
                apiName="suggest"
                showCurrentLocation
              />
              <AddressForm.TextField
                name="addressLineTwo"
                label="Address Line 2"
                placeholder="Apartment, suite, etc."
              />
              <div className="grid grid-cols-2 gap-3">
                <AddressForm.TextField
                  name="city"
                  label="City"
                />
                <AddressForm.TextField
                  name="province"
                  label="State / Province"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <AddressForm.TextField
                  name="postalCode"
                  label="Postal / Zip Code"
                />
                <AddressForm.CountryField
                  name="country"
                  label="Country"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Submit Address
              </button>
              <button
                type="reset"
                className="px-6 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
            </div>
          </AddressForm>
        </div>

        {submittedData && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              Submitted Address Data
            </h3>
            <pre className="text-sm bg-gray-50 rounded-lg p-4 overflow-x-auto">
              {JSON.stringify(submittedData, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  )
}
