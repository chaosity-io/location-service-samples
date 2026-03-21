import { LocationProvider } from '@/components/LocationProvider'
import '@/styles/globals.css'

export const metadata = {
  title: 'Location Service Demo',
  description: 'Next.js App Router with Location Service',
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
