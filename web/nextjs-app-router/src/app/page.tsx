import { DemoTabs } from '@/components/DemoTabs'

export default function Home() {
  return (
    <main>
      <h1>Location Service API Demo</h1>
      <p>
        Interactive examples of all Places API endpoints using{' '}
        <code>@chaosity/location-client-react</code> with Next.js App Router.
      </p>
      <DemoTabs />
    </main>
  )
}
