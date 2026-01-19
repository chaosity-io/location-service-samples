// Token cache
let tokenCache = null

// Get token from backend (with caching)
async function getToken() {
  // Return cached token if still valid
  if (tokenCache && Date.now() < tokenCache.expires_at) {
    console.log('Using cached token')
    return tokenCache
  }

  console.log('Fetching new token from backend')
  
  // Fetch new token from backend
  const response = await fetch('/api/token')
  if (!response.ok) {
    throw new Error('Failed to get token')
  }

  tokenCache = await response.json()
  return tokenCache
}

// Search places
async function searchPlaces(query) {
  try {
    // Get token (automatically cached)
    const { access_token, api_url } = await getToken()

    // Make API request with token
    const response = await fetch(`${api_url}/address/search/text`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        QueryText: query,
        MaxResults: 5
      })
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
  
  if (results.length === 0) {
    resultsDiv.innerHTML = '<p>No results found</p>'
    return
  }

  const html = results.map(item => `
    <div class="result-item">
      <strong>${item.Title}</strong><br>
      <small>${item.Address?.Label || 'No address'}</small>
    </div>
  `).join('')

  resultsDiv.innerHTML = html
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
    document.getElementById('results').innerHTML = 
      `<p class="error">Error: ${error.message}</p>`
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
