# Store Finder Use Case

## Overview

This sample demonstrates how to build a **Store Finder** application where customers can find the nearest store location based on their address or postcode.

## Real-World Business Value

- **Retail Chains**: Help customers find nearest store for pickup/returns
- **Restaurants**: Show closest locations for delivery/takeout
- **Service Providers**: Direct customers to nearest service center
- **Petrol Stations**: Find closest fuel station
- **Banks/ATMs**: Locate nearest branch or ATM

## Implementation Pattern

### 1. Customer Enters Postcode/Address

```typescript
// Customer types postcode
const searchQuery = "90210"

// Use Geocode API for precise results
const command = new GeocodeCommand({
  QueryText: searchQuery,
  MaxResults: 1,
})
const response = await client.send(command)
const customerLocation = response.ResultItems[0].Position // [lng, lat]
```

### 2. Find Nearest Stores

```typescript
// Your store locations (from database)
const stores = [
  { id: 1, name: "Store A", position: [-118.4, 34.1] },
  { id: 2, name: "Store B", position: [-118.3, 34.0] },
  { id: 3, name: "Store C", position: [-118.5, 34.2] },
]

// Calculate distances
function getDistance(pos1: [number, number], pos2: [number, number]): number {
  const [lng1, lat1] = pos1
  const [lng2, lat2] = pos2
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Find nearest
const storesWithDistance = stores.map(store => ({
  ...store,
  distance: getDistance(customerLocation, store.position)
}))

const nearest = storesWithDistance.sort((a, b) => a.distance - b.distance)[0]
```

### 3. Display on Map

```typescript
// Show customer location
new maplibregl.Marker({ color: '#3b82f6' })
  .setLngLat(customerLocation)
  .addTo(map)

// Show nearest store
new maplibregl.Marker({ color: '#ef4444' })
  .setLngLat(nearest.position)
  .setPopup(new maplibregl.Popup().setHTML(`
    <strong>${nearest.name}</strong><br>
    ${nearest.distance.toFixed(1)} km away
  `))
  .addTo(map)

// Fit map to show both
const bounds = new maplibregl.LngLatBounds()
bounds.extend(customerLocation)
bounds.extend(nearest.position)
map.fitBounds(bounds, { padding: 50 })
```

## Advanced Features

### Filter by Service Area

```typescript
// Only show stores within 10km
const nearbyStores = storesWithDistance.filter(s => s.distance <= 10)
```

### Show Multiple Stores

```typescript
// Show 3 nearest stores
const topStores = storesWithDistance.slice(0, 3)
topStores.forEach(store => {
  new maplibregl.Marker()
    .setLngLat(store.position)
    .setPopup(new maplibregl.Popup().setHTML(`
      <strong>${store.name}</strong><br>
      ${store.distance.toFixed(1)} km away
    `))
    .addTo(map)
})
```

### Check Store Hours/Inventory

```typescript
// After finding nearest store, check availability
const storeDetails = await fetch(`/api/stores/${nearest.id}`)
const { hours, inventory } = await storeDetails.json()

// Show to customer
console.log(`Open: ${hours.open} - ${hours.close}`)
console.log(`In stock: ${inventory.available}`)
```

## API Costs

- **Geocode**: $0.50 per 1,000 requests
- **ReverseGeocode**: $0.50 per 1,000 requests (if using "Use My Location")

**Example**: 10,000 customers/month = $5/month

## Complete Example

```typescript
async function findNearestStore(postcode: string) {
  // 1. Get customer location from postcode
  const geocodeCmd = new GeocodeCommand({
    QueryText: postcode,
    MaxResults: 1,
  })
  const geocodeRes = await client.send(geocodeCmd)
  const customerPos = geocodeRes.ResultItems[0].Position

  // 2. Load stores from database
  const stores = await db.stores.findAll()

  // 3. Calculate distances
  const withDistance = stores.map(store => ({
    ...store,
    distance: getDistance(customerPos, store.position)
  }))

  // 4. Find nearest
  const nearest = withDistance.sort((a, b) => a.distance - b.distance)[0]

  // 5. Return result
  return {
    store: nearest,
    customerLocation: customerPos,
    distance: nearest.distance,
  }
}
```

## Integration with Existing Systems

### E-commerce Checkout

```typescript
// During checkout, suggest pickup location
const nearest = await findNearestStore(customer.postcode)
showPickupOption({
  store: nearest.store.name,
  address: nearest.store.address,
  distance: `${nearest.distance.toFixed(1)} km away`,
})
```

### Mobile App

```typescript
// Use device location
navigator.geolocation.getCurrentPosition(async (pos) => {
  const { longitude, latitude } = pos.coords
  
  // Reverse geocode to get address
  const reverseCmd = new ReverseGeocodeCommand({
    QueryPosition: [longitude, latitude],
  })
  const address = await client.send(reverseCmd)
  
  // Find nearest store
  const nearest = await findNearestStore(address.ResultItems[0].Address.PostalCode)
  showStoreDetails(nearest)
})
```

## Performance Tips

1. **Cache store locations** - Don't query database on every request
2. **Pre-calculate regions** - Group stores by region/city
3. **Use CDN** - Cache geocode results for common postcodes
4. **Batch requests** - If showing multiple stores, batch API calls

## ROI Example

**Retail Chain with 100 stores:**
- 50,000 customers/month use store finder
- 30% increase in in-store pickups
- Reduced shipping costs: $2/order × 15,000 orders = $30,000/month saved
- API costs: $25/month
- **Net savings: $29,975/month**
