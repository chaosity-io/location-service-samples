# Next.js App Router Sample

⭐ **Recommended for React** - Next.js 14+ with App Router, Server Actions, and LocationClientProvider.

## Features

- ✅ **Server Actions** - Secure credential handling
- ✅ **LocationClientProvider** - Automatic token management
- ✅ **React hooks** - `useLocationClient()` for easy access
- ✅ **TypeScript** - Full type safety
- ✅ **Search component** - Working example

## Prerequisites

- Node.js 18+
- Location Service API credentials

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure credentials:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your credentials:
   ```bash
   LOCATION_API_URL=https://api.yourdomain.com
   LOCATION_CLIENT_ID=your_client_id
   LOCATION_CLIENT_SECRET=your_client_secret
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   ```
   http://localhost:3000
   ```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with provider
│   ├── page.tsx            # Home page
│   └── globals.css         # Global styles
├── components/
│   ├── LocationProvider.tsx # Client provider wrapper
│   └── SearchBox.tsx       # Search component
└── lib/
    └── actions/
        └── location.ts     # Server Action
```

## Key Concepts

### 1. Server Action (Secure)
```typescript
'use server'
export async function getLocationConfig() {
  return getClientConfig({
    apiUrl: process.env.LOCATION_API_URL!,
    clientId: process.env.LOCATION_CLIENT_ID!,
    clientSecret: process.env.LOCATION_CLIENT_SECRET!
  })
}
```

### 2. Provider Setup
```tsx
<LocationClientProvider getConfig={getLocationConfig}>
  {children}
</LocationClientProvider>
```

### 3. Use in Components
```tsx
const { client, loading } = useLocationClient()

const result = await client.send(new SearchTextCommand({
  QueryText: 'Space Needle'
}))
```

## Security

✅ Credentials stay server-side (Server Actions)
✅ Tokens generated server-side only
✅ Automatic token refresh (60s buffer)
✅ No credential exposure to browser

## Learn More

- [Documentation](https://docs.chaosity.io)
- [React Client](https://www.npmjs.com/package/@chaosity/location-client-react)
- [Next.js App Router](https://nextjs.org/docs/app)
