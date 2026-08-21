'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PAGES: { href: string; label: string; hint: string }[] = [
  { href: '/', label: 'Address finder', hint: 'Autocomplete · Geocode · GetPlace · ReverseGeocode · map' },
  { href: '/geocoder', label: 'Map geocoder', hint: 'MapLibre geocoder adapter: Suggest → GetPlace' },
  { href: '/address-form', label: 'Address form', hint: '@chaosity/address-form (autocomplete / suggest)' },
  { href: '/nearby', label: 'Nearby & text', hint: 'SearchNearby · SearchText · static map' },
  { href: '/server', label: 'Server-side', hint: 'Bearer connector and Basic auth from a route handler' },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <div className="mr-2">
          <div className="text-sm font-semibold text-gray-900">Location Service testbed</div>
          <div className="text-xs text-gray-500">one app, every scenario</div>
        </div>
        <nav className="flex flex-wrap gap-1">
          {PAGES.map((p) => {
            const active = p.href === '/' ? pathname === '/' : pathname.startsWith(p.href)
            return (
              <Link
                key={p.href}
                href={p.href}
                title={p.hint}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {p.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
