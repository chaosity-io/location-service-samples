'use client'

import { CheckoutForm } from '@/components/CheckoutForm'

const CART_ITEMS = [
  { id: 1, name: 'Wireless Headphones', price: 79.99, qty: 1, color: '#6366f1' },
  { id: 2, name: 'USB-C Charging Cable', price: 14.99, qty: 2, color: '#10b981' },
  { id: 3, name: 'Laptop Stand', price: 49.99, qty: 1, color: '#f59e0b' },
]

function OrderSummary() {
  const subtotal = CART_ITEMS.reduce((sum, item) => sum + item.price * item.qty, 0)
  const shipping = 5.99
  const tax = subtotal * 0.08
  const total = subtotal + shipping + tax

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
      <div className="space-y-4">
        {CART_ITEMS.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
              <p className="text-xs text-gray-500">Qty: {item.qty}</p>
            </div>
            <p className="text-sm font-medium text-gray-900">
              ${(item.price * item.qty).toFixed(2)}
            </p>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
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
        <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-semibold text-gray-900">
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
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg" />
            <span className="text-lg font-bold text-gray-900">ShopDemo</span>
          </div>
          <span className="text-sm text-gray-500">Secure Checkout</span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            <CheckoutForm />
          </div>
          <div className="w-full lg:w-[320px] shrink-0">
            <div className="lg:sticky lg:top-8">
              <OrderSummary />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
