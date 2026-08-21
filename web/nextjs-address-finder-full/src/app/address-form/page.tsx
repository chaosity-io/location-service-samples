import { AddressFormDemo } from '@/components/AddressFormDemo'

export const dynamic = 'force-dynamic'

export default function AddressFormPage() {
  return (
    <main className="py-8">
      <div className="container mx-auto max-w-3xl px-4">
        <div className="mb-6">
          <h1 className="mb-1 text-3xl font-bold text-gray-900">Address form</h1>
          <p className="text-gray-600">
            The <code>@chaosity/address-form</code> component on top of the same
            provider: <code>Autocomplete</code> (Core) or <code>Suggest</code>{' '}
            (Pro) while typing, <code>GetPlace</code> on select (secondary
            addresses expand), <code>ReverseGeocode</code> for the location
            button. Submit returns the structured address.
          </p>
        </div>

        <AddressFormDemo />
      </div>
    </main>
  )
}
