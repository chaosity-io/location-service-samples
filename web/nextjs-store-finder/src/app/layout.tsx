import { LocationProvider } from '@/components/LocationProvider'
import '@/styles/globals.css'

export const metadata = {
  title: 'Store Finder',
  description: 'Find nearby stores with address search and interactive map',
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
