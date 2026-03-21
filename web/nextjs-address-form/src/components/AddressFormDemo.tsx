'use client'

import {
  AddressForm,
  type AddressFormData,
  type SubmitHandler,
} from '@chaosity/address-form'
import '@chaosity/address-form/dist/lib/address-form.css'
import { useState } from 'react'

export function AddressFormDemo() {
  const [submittedData, setSubmittedData] = useState<AddressFormData | null>(
    null,
  )

  const handleSubmit: SubmitHandler = async (getData) => {
    const data = await getData({ intendedUse: 'SingleUse' })
    setSubmittedData(data)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <h1 className="text-lg font-bold text-gray-900">Address Form Demo</h1>
          <p className="text-sm text-gray-500">
            Using{' '}
            <code className="rounded bg-gray-100 px-1">
              @chaosity/address-form
            </code>{' '}
            with autocomplete
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Enter your address
          </h2>

          <AddressForm
            onSubmit={handleSubmit}
            allowedCountries={['US', 'CA', 'AU', 'GB']}
          >
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
                <AddressForm.TextField name="city" label="City" />
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
                <AddressForm.CountryField name="country" label="Country" />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                Submit Address
              </button>
              <button
                type="reset"
                className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
          </AddressForm>
        </div>

        {submittedData && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-base font-semibold text-gray-900">
              Submitted Address Data
            </h3>
            <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-sm">
              {JSON.stringify(submittedData, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  )
}
