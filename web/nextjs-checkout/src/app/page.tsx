'use client'

import { CheckoutForm } from '@/components/CheckoutForm'

const CART_ITEMS = [
  {
    id: 1,
    name: 'Wireless Headphones',
    price: 79.99,
    qty: 1,
    color: '#6366f1',
  },
  {
    id: 2,
    name: 'USB-C Charging Cable',
    price: 14.99,
    qty: 2,
    color: '#10b981',
  },
  { id: 3, name: 'Laptop Stand', price: 49.99, qty: 1, color: '#f59e0b' },
]

function OrderSummary() {
  const subtotal = CART_ITEMS.reduce(
    (sum, item) => sum + item.price * item.qty,
    0,
  )
  const shipping = 5.99
  const tax = subtotal * 0.08
  const total = subtotal + shipping + tax

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Order Summary
      </h2>
      <div className="space-y-4">
        {CART_ITEMS.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <div
              className="h-12 w-12 shrink-0 rounded-lg"
              style={{ backgroundColor: item.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {item.name}
              </p>
              <p className="text-xs text-gray-500">Qty: {item.qty}</p>
            </div>
            <p className="text-sm font-medium text-gray-900">
              ${(item.price * item.qty).toFixed(2)}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Shipping</span>
          <span>${shipping.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Tax</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold text-gray-900">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600" />
            <span className="text-lg font-bold text-gray-900">ShopDemo</span>
          </div>
          <span className="text-sm text-gray-500">Secure Checkout</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <CheckoutForm />
          </div>
          <div className="w-full shrink-0 lg:w-[320px]">
            <div className="lg:sticky lg:top-8">
              <OrderSummary />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
