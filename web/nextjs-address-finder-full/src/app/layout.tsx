import { LocationProvider } from '@/components/LocationProvider'
import '@/styles/globals.css'

export const metadata = {
  title: 'Address Finder & Validator',
  description:
    'Find and validate addresses with autocomplete and map visualization',
  icons: { icon: '/favicon.svg', type: 'image/x-icon' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <LocationProvider>{children}</LocationProvider>
      </body>
    </html>
  )
}
