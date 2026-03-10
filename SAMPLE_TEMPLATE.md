# Sample Template

Use this template when creating new samples.

## Directory Structure

```
sample-name/
├── README.md              # This file
├── package.json           # Dependencies (if applicable)
├── .env.example           # Required environment variables
├── .gitignore            # Ignore patterns
├── src/                   # Source code
│   ├── index.html        # Entry point (web)
│   ├── main.js           # Main JavaScript
│   └── styles.css        # Styles
├── public/                # Static assets
│   └── favicon.ico
└── screenshot.png         # Visual preview
```

## README Template

```markdown
# [Sample Name]

[Brief description of what this sample demonstrates]

![Screenshot](./screenshot.png)

## Features

- Feature 1
- Feature 2
- Feature 3

## Prerequisites

- Node.js 18+ (or specific version)
- NPM or Yarn
- Chaosity Location Service API credentials

## Setup

1. Clone this repository
2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Add your credentials to `.env.local`
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run the development server:
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

See `.env.example` for required variables:

- `LOCATION_SERVICE_API_URL` - API endpoint
- `LOCATION_SERVICE_CLIENT_ID` - Your client ID
- `LOCATION_SERVICE_CLIENT_SECRET` - Your client secret

Get credentials at [portal.chaosity.cloud](https://portal.chaosity.cloud)

## Key Concepts

Explain the main concepts demonstrated:

1. **Concept 1** - Description
2. **Concept 2** - Description
3. **Concept 3** - Description

## Code Highlights

```javascript
// Show important code snippets with explanations
```

## Learn More

- [API Documentation](https://docs.chaosity.cloud)
- [NPM Package](https://www.npmjs.com/package/@chaosity/location-client)
- [Developer Portal](https://portal.chaosity.cloud)

## License

MIT
```

## .env.example Template

```bash
# Chaosity Location Service Configuration
LOCATION_SERVICE_API_URL=https://api.chaosity.cloud/v1
LOCATION_SERVICE_CLIENT_ID=your_client_id_here
LOCATION_SERVICE_CLIENT_SECRET=your_client_secret_here

# Optional: Map Configuration
MAP_CENTER_LAT=49.2827
MAP_CENTER_LNG=-123.1207
MAP_ZOOM=12
```

## package.json Template (Web)

```json
{
  "name": "@chaosity/sample-name",
  "version": "1.0.0",
  "private": true,
  "description": "Sample description",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@chaosity/location-client": "^0.1.3"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

## package.json Template (React)

```json
{
  "name": "@chaosity/sample-name",
  "version": "1.0.0",
  "private": true,
  "description": "Sample description",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@chaosity/location-client-react": "^0.1.4"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
```

## Best Practices

1. **Keep it simple** - Focus on one concept per sample
2. **Add comments** - Explain non-obvious code
3. **Error handling** - Show proper error handling
4. **Responsive** - Make it work on mobile
5. **Accessible** - Follow accessibility guidelines
6. **Performance** - Optimize for production
7. **Security** - Never commit credentials
8. **Documentation** - Clear setup instructions
