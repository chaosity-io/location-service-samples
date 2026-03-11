'use client'

import { useState, useCallback } from 'react'
import { AddressForm, EMPTY_ADDRESS } from './AddressForm'
import type { AddressFields } from './AddressForm'

const STEPS = ['Shipping Address', 'Billing Address', 'Review & Place Order'] as const

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((label, idx) => {
        const isCompleted = idx < currentStep
        const isCurrent = idx === currentStep
        return (
          <div key={label} className="flex-1 flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`text-sm font-medium hidden sm:inline ${
                  isCurrent ? 'text-indigo-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-3 ${
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
      US: 'United States', CA: 'Canada', GB: 'United Kingdom', FR: 'France',
      DE: 'Germany', JP: 'Japan', AU: 'Australia', IT: 'Italy', ES: 'Spain',
      BR: 'Brazil', MX: 'Mexico', IN: 'India', NL: 'Netherlands', SE: 'Sweden',
      NZ: 'New Zealand',
    }[address.country] || address.country

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
        <button
          type="button"
          onClick={onEdit}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Edit
        </button>
      </div>
      <div className="text-sm text-gray-700 space-y-0.5">
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
    [shipping]
  )

  if (orderPlaced) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Placed!</h2>
        <p className="text-gray-600 mb-6">
          Your order has been confirmed. You will receive a confirmation email shortly.
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
          className="px-6 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          Start New Order
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
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
                className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sameAsShipping}
                  onChange={(e) => handleSameAsShippingChange(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Same as shipping address
                </span>
              </label>
            </div>

            {sameAsShipping ? (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-6">
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
                className="px-6 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleContinueToBilling}
                disabled={
                  !sameAsShipping &&
                  (!billing.address1 || !billing.city)
                }
                className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue to Review
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review & Place Order */}
        {step === 2 && (
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Review Your Order
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
                className="px-6 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handlePlaceOrder}
                className="px-8 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
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
