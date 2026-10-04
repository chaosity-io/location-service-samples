// Token cache
let tokenCache = null
const REFRESH_BUFFER_MS = 60_000 // Refresh 60s before expiry

// Get token from backend (with caching). `refusedToken` is a token the API
// has just refused: the backend replaces it rather than hand it back.
async function getToken(refusedToken) {
  // Return cached token if still valid (with buffer to avoid mid-request expiry)
  if (
    !refusedToken &&
    tokenCache &&
    Date.now() < tokenCache.expires_at - REFRESH_BUFFER_MS
  ) {
    console.log('Using cached token')
    return tokenCache
  }

  console.log('Fetching new token from backend')

  // In the body, not the URL, so the token stays out of access logs.
  const response = await fetch('http://localhost:3001/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(refusedToken ? { refusedToken } : {}),
  })
  if (!response.ok) {
    throw new Error('Failed to get token')
  }

  tokenCache = await response.json()
  return tokenCache
}

// The API refuses a token before its expiry when it is revoked or its secret
// is rotated. Ask once for a replacement, and retry only with a different one.
async function postWithToken(path, body) {
  const send = ({ access_token, api_url }) =>
    fetch(`${api_url}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

  const first = await getToken()
  const response = await send(first)
  if (response.status !== 401) return response

  const fresh = await getToken(first.access_token)
  return fresh.access_token === first.access_token ? response : send(fresh)
}

// Search places
async function searchPlaces(query) {
  try {
    // Make API request with the cached token, replaced once if refused
    const response = await postWithToken('/address/search/text', {
      QueryText: query,
      MaxResults: 5
    })

    if (!response.ok) {
      throw new Error('Search failed')
    }

    const data = await response.json()
    return data.ResultItems || []
  } catch (error) {
    console.error('Search error:', error)
    throw error
  }
}

// Display results
function displayResults(results) {
  const resultsDiv = document.getElementById('results')
  resultsDiv.innerHTML = ''

  if (results.length === 0) {
    const p = document.createElement('p')
    p.textContent = 'No results found'
    resultsDiv.appendChild(p)
    return
  }

  for (const item of results) {
    const div = document.createElement('div')
    div.className = 'result-item'

    const title = document.createElement('strong')
    title.textContent = item.Title
    div.appendChild(title)

    if (item.Address?.Label) {
      div.appendChild(document.createElement('br'))
      const address = document.createElement('small')
      address.textContent = item.Address.Label
      div.appendChild(address)
    }

    resultsDiv.appendChild(div)
  }
}

// Event listeners
document.getElementById('searchBtn').addEventListener('click', async () => {
  const query = document.getElementById('searchInput').value
  if (!query) return

  const btn = document.getElementById('searchBtn')
  btn.disabled = true
  btn.textContent = 'Searching...'

  try {
    const results = await searchPlaces(query)
    displayResults(results)
  } catch (error) {
    const resultsDiv = document.getElementById('results')
    resultsDiv.innerHTML = ''
    const p = document.createElement('p')
    p.className = 'error'
    p.textContent = `Error: ${error.message}`
    resultsDiv.appendChild(p)
  } finally {
    btn.disabled = false
    btn.textContent = 'Search'
  }
})

// Search on Enter key
document.getElementById('searchInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('searchBtn').click()
  }
})
