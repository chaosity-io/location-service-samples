import NearbySearch from '@/components/NearbySearch'

export default function NearbyPage() {
  return (
    <main className="py-8">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-6">
          <h1 className="mb-1 text-3xl font-bold text-gray-900">
            Nearby &amp; text search, static map
          </h1>
          <p className="text-gray-600">
            Click the map to set the query position, then <code>SearchNearby</code>{' '}
            (radius + category filter) or <code>SearchText</code> (free text,
            biased to the position). Results are pinned; the raw response is shown
            so the forwarded fields and returned shapes are visible. The static
            map button fetches <code>/maps/static/&#123;fileName&#125;</code> with the bearer
            token (Enterprise tier).
          </p>
        </div>

        <NearbySearch />
      </div>
    </main>
  )
}
