'use client'

import { useCountry } from '@/lib/settings/country'
import {
  AddressForm,
  type AddressFormData,
  type SubmitHandler,
} from '@chaosity/address-form'
import '@chaosity/address-form/dist/lib/address-form.css'
import { useState } from 'react'

type ApiMode = 'autocomplete' | 'suggest'

export function AddressFormDemo({
  defaultApiMode = 'autocomplete',
}: {
  defaultApiMode?: ApiMode
}) {
  const [submittedData, setSubmittedData] = useState<AddressFormData | null>(
    null,
  )
  const [apiMode, setApiMode] = useState<ApiMode>(defaultApiMode)
  // Off by default, as in the library: every verification is billed, whether
  // or not the address verifies.
  const [verify, setVerify] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const country = useCountry()

  // The form's country list follows the global selection: a scoped
  // application offers its scope with the selected country first (the form
  // defaults to the first entry); an unscoped one with a country picked is
  // narrowed to it; worldwide leaves the form's own full list.
  const allowedCountries = country.scoped
    ? [country.code, ...country.scope.filter((c) => c !== country.code)]
    : country.code
      ? [country.code]
      : undefined

  const handleSubmit: SubmitHandler = async (getData) => {
    setSubmitError(null)
    try {
      // No argument since address-form 0.4.0: the API never forwards
      // IntendedUse, so the form stopped asking for it. With `verify` on,
      // getData() also sends the picked PlaceId to POST /address/verify and
      // adds `verified` and `verification`, the one result you may store.
      const data = await getData()
      setSubmittedData(data)
    } catch (err) {
      // A failed verification rejects getData(); the form's banner shows it
      // too. It is not kept, so the next submit tries again.
      setSubmittedData(null)
      setSubmitError(err instanceof Error ? err.message : String(err))
    }
  }

  const modeButton = (mode: ApiMode, label: string) => (
    <button
      type="button"
      onClick={() => setApiMode(mode)}
      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
        apiMode === mode
          ? 'bg-blue-600 text-white'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow">
        <div className="text-sm text-gray-600">
          {apiMode === 'autocomplete' ? (
            <>
              <strong>Autocomplete:</strong> <code>/address/autocomplete</code>{' '}
              + <code>/address/place</code> +{' '}
              <code>/address/search/reverse-geocode</code>
            </>
          ) : (
            <>
              <strong>Suggest:</strong> <code>/address/suggestion</code> (the
              location button too) + <code>/address/place</code>
            </>
          )}
          {verify && (
            <>
              {' '}
              + <code>/address/verify</code> on submit
            </>
          )}
          <div className="mt-1 text-xs text-gray-500">
            Countries offered:{' '}
            {allowedCountries ? allowedCountries.join(', ') : 'all'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">API mode:</span>
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {modeButton('autocomplete', 'Autocomplete')}
              {modeButton('suggest', 'Suggest')}
            </div>
          </div>
          <label
            className="flex items-center gap-1.5 text-xs text-gray-600"
            title="Each verification is billed, whether or not the address verifies"
          >
            <input
              type="checkbox"
              checked={verify}
              onChange={(e) => setVerify(e.target.checked)}
            />
            Verify on submit (billed)
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Enter your address
        </h2>

        <AddressForm
          key={`${apiMode}:${allowedCountries?.join(',') ?? 'all'}`}
          onSubmit={handleSubmit}
          allowedCountries={allowedCountries}
          verify={verify}
        >
          <div className="space-y-3">
            <AddressForm.AddressField
              name="addressLineOne"
              label="Address"
              placeholder="Start typing your address..."
              apiName={apiMode}
              showCurrentLocation
            />
            <AddressForm.TextField
              name="addressLineTwo"
              label="Address Line 2"
              placeholder="Apartment, suite, etc."
            />
            <div className="grid grid-cols-2 gap-3">
              <AddressForm.TextField name="city" label="City" />
              <AddressForm.TextField name="province" label="State / Province" />
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
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Submit address
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

      {submitError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {submitError}
        </div>
      )}

      {submittedData && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 text-base font-semibold text-gray-900">
            Submitted address data
          </h3>
          <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-sm">
            {JSON.stringify(submittedData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
