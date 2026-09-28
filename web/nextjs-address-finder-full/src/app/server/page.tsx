import ServerPlayground from '@/components/ServerPlayground'

export default function ServerPage() {
  return (
    <main className="py-8">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-6">
          <h1 className="mb-1 text-3xl font-bold text-gray-900">
            Server-side calls
          </h1>
          <p className="text-gray-600">
            A route handler (<code>/api/server</code>) calls the API from the
            server: either through <code>LocationServiceConnector</code> (bearer
            token from the client credentials, refreshed automatically) or with
            direct <strong>Basic</strong> auth — the two server-to-server modes
            the docs describe. The <code>Origin</code> header is forwarded from
            the browser request, as the API requires.
          </p>
        </div>

        <ServerPlayground />
      </div>
    </main>
  )
}
