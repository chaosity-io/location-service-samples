import NearbySearch from '@/components/NearbySearch'

export default function NearbyPage() {
  return (
    <main className="py-8">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-6">
          <h1 className="mb-1 text-3xl font-bold text-gray-900">
            Nearby &amp; text search
          </h1>
          <p className="text-gray-600">
            <code>SearchNearby</code> (radius + category filter) or{' '}
            <code>SearchText</code> (free text, biased) from a query position —
            the map centre, or a point you click. Both send the selected country
            and language. Results are pinned and the raw response is shown, so
            the forwarded fields and returned shapes are visible.
          </p>
        </div>

        <NearbySearch />
      </div>
    </main>
  )
}
