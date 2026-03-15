import { LocationProvider } from '@/components/LocationProvider'
import '@/styles/globals.css'

export const metadata = {
  title: 'Address Form Demo',
  description: 'Address form with autocomplete using @chaosity/address-form',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LocationProvider>{children}</LocationProvider>
      </body>
    </html>
  )
}
