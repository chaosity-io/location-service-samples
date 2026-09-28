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

- `LOCATION_API_URL` - the API endpoint shown for your application
- `LOCATION_CLIENT_ID` - Your client ID
- `LOCATION_CLIENT_SECRET` - Your client secret

These are the names `@chaosity/location-client` reads from the environment.
Get the endpoint and credentials for your application at
[location-dashboard.chaosity.cloud](https://location-dashboard.chaosity.cloud)

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
- [Dashboard](https://location-dashboard.chaosity.cloud)

## License

MIT
```

## .env.example Template

```bash
# Chaosity Location Service Configuration: the endpoint shown for your
# application, with no path after it, and its client credentials
LOCATION_API_URL=https://api.yourdomain.com
LOCATION_CLIENT_ID=your_client_id_here
LOCATION_CLIENT_SECRET=your_client_secret_here

# Optional: Map Configuration
MAP_CENTER_LAT=49.2827
MAP_CENTER_LNG=-123.1207
MAP_ZOOM=12
```

## package.json Template (Web)

Take each `@chaosity/*` version from `npm view <package> version` when you
create the sample, not from here: a caret range on `0.x` never leaves its
minor (see `AGENTS.md`). A sample that draws a map also needs MapLibre's worker
served, which `AGENTS.md` describes.

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
    "@chaosity/location-client": "^0.11.0"
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
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@chaosity/location-client-react": "^0.9.0"
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
