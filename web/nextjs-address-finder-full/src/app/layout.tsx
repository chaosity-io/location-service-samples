import { LocationProvider } from '@/components/LocationProvider'
import { Nav } from '@/components/Nav'
import { SettingsBar } from '@/components/SettingsBar'
import '@/styles/globals.css'

export const metadata = {
  title: 'Location Service testbed',
  description:
    'One Next.js app exercising every Location Service scenario: address finder, map geocoder, address form, nearby/text search, maps and static map, server-side calls',
  icons: { icon: '/favicon.svg', type: 'image/svg+xml' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <LocationProvider>
          <Nav />
          {/* Country + map settings: global, persisted, applied on every page. */}
          <SettingsBar />
          {children}
        </LocationProvider>
      </body>
    </html>
  )
}
