import { LocationProvider } from '@/components/LocationProvider'
import '@/styles/globals.css'

export const metadata = {
  title: 'Checkout - Address Validation',
  description: 'E-commerce checkout with address autocomplete and geocode validation',
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
