'use client'

import { useCallback, useState } from 'react'
import type { AddressFields } from './AddressForm'
import { AddressForm, EMPTY_ADDRESS } from './AddressForm'

const STEPS = [
  'Shipping Address',
  'Billing Address',
  'Review & Place Order',
] as const

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8 flex items-center justify-between">
      {STEPS.map((label, idx) => {
        const isCompleted = idx < currentStep
        const isCurrent = idx === currentStep
        return (
          <div key={label} className="flex flex-1 items-center">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`hidden text-sm font-medium sm:inline ${
                  isCurrent
                    ? 'text-indigo-600'
                    : isCompleted
                      ? 'text-green-600'
                      : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`mx-3 h-px flex-1 ${
                  idx < currentStep ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function AddressCard({
  label,
  address,
  onEdit,
}: {
  label: string
  address: AddressFields
  onEdit: () => void
}) {
  const countryName =
    {
      US: 'United States',
      CA: 'Canada',
      GB: 'United Kingdom',
      FR: 'France',
      DE: 'Germany',
      JP: 'Japan',
      AU: 'Australia',
      IT: 'Italy',
      ES: 'Spain',
      BR: 'Brazil',
      MX: 'Mexico',
      IN: 'India',
      NL: 'Netherlands',
      SE: 'Sweden',
      NZ: 'New Zealand',
    }[address.country] || address.country

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          Edit
        </button>
      </div>
      <div className="space-y-0.5 text-sm text-gray-700">
        <p>{address.address1}</p>
        {address.address2 && <p>{address.address2}</p>}
        <p>
          {address.city}
          {address.state && `, ${address.state}`} {address.postal}
        </p>
        <p>{countryName}</p>
      </div>
    </div>
  )
}

export function CheckoutForm() {
  const [step, setStep] = useState(0)
  const [shipping, setShipping] = useState<AddressFields>({ ...EMPTY_ADDRESS })
  const [billing, setBilling] = useState<AddressFields>({ ...EMPTY_ADDRESS })
  const [sameAsShipping, setSameAsShipping] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  const goToStep = useCallback((target: number) => {
    setTransitioning(true)
    setTimeout(() => {
      setStep(target)
      setTransitioning(false)
    }, 150)
  }, [])

  const handleContinueToShipping = useCallback(() => {
    if (!shipping.address1 || !shipping.city) return
    goToStep(1)
  }, [shipping, goToStep])

  const handleContinueToBilling = useCallback(() => {
    const effectiveBilling = sameAsShipping ? shipping : billing
    if (!effectiveBilling.address1 || !effectiveBilling.city) {
      if (!sameAsShipping) return
    }
    goToStep(2)
  }, [sameAsShipping, shipping, billing, goToStep])

  const handlePlaceOrder = useCallback(() => {
    setOrderPlaced(true)
  }, [])

  const handleSameAsShippingChange = useCallback(
    (checked: boolean) => {
      setSameAsShipping(checked)
      if (checked) {
        setBilling({ ...shipping })
      }
    },
    [shipping],
  )

  if (orderPlaced) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">
          Order Placed!
        </h2>
        <p className="mb-6 text-gray-600">
          Your order has been confirmed. You will receive a confirmation email
          shortly.
        </p>
        <button
          type="button"
          onClick={() => {
            setOrderPlaced(false)
            setStep(0)
            setShipping({ ...EMPTY_ADDRESS })
            setBilling({ ...EMPTY_ADDRESS })
            setSameAsShipping(false)
          }}
          className="rounded-lg border border-indigo-200 px-6 py-2 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
        >
          Start New Order
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <StepIndicator currentStep={step} />

      <div
        className={`transition-opacity duration-150 ${
          transitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Step 0: Shipping Address */}
        {step === 0 && (
          <div>
            <AddressForm
              address={shipping}
              onChange={setShipping}
              label="Shipping Address"
            />
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleContinueToShipping}
                disabled={!shipping.address1 || !shipping.city}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to Billing
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Billing Address */}
        {step === 1 && (
          <div>
            <div className="mb-6">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={sameAsShipping}
                  onChange={(e) => handleSameAsShippingChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Same as shipping address
                </span>
              </label>
            </div>

            {sameAsShipping ? (
              <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-700">{shipping.address1}</p>
                {shipping.address2 && (
                  <p className="text-sm text-gray-700">{shipping.address2}</p>
                )}
                <p className="text-sm text-gray-700">
                  {shipping.city}
                  {shipping.state && `, ${shipping.state}`} {shipping.postal}
                </p>
              </div>
            ) : (
              <AddressForm
                address={billing}
                onChange={setBilling}
                label="Billing Address"
              />
            )}

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => goToStep(0)}
                className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleContinueToBilling}
                disabled={
                  !sameAsShipping && (!billing.address1 || !billing.city)
                }
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to Review
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review & Place Order */}
        {step === 2 && (
          <div>
            <h3 className="mb-4 text-base font-semibold text-gray-900">
              Review Your Order
            </h3>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AddressCard
                label="Shipping Address"
                address={shipping}
                onEdit={() => goToStep(0)}
              />
              <AddressCard
                label="Billing Address"
                address={sameAsShipping ? shipping : billing}
                onEdit={() => goToStep(1)}
              />
            </div>

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => goToStep(1)}
                className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handlePlaceOrder}
                className="rounded-lg bg-green-600 px-8 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
              >
                Place Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
