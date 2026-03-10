# Location Service Code Samples

Official code samples for integrating with Location Service API. Examples cover authentication methods, client libraries, and common use cases.

## 🚀 Quick Start

1. **Get Credentials:** Sign up at your organization's portal
2. **Choose a Sample:** Pick from backend, web, or mobile samples below
3. **Clone & Run:** Follow the README in each sample directory

## 📦 Sample Categories

### Backend Samples

Server-side integration examples for various languages and authentication methods.

| Sample | Description | Auth Method | Language |
|--------|-------------|-------------|----------|
| [nodejs-client-library](./backend/nodejs-client-library) | ⭐ **Recommended** - Client library with getToken() | Client Library | Node.js |
| [nodejs-direct-auth](./backend/nodejs-direct-auth) | Direct Authentication with HTTP Basic Auth | Direct Auth | Node.js |
| [nodejs-manual-token](./backend/nodejs-manual-token) | Manual token generation with custom caching | Token-Based | Node.js |
| python-* | 🚧 Under construction | Various | Python |

### Web Samples

Frontend integration examples for web applications.

| Sample | Description | Framework | Features |
|--------|-------------|-----------|----------|
| [nextjs-app-router](./web/nextjs-app-router) | ⭐ **Recommended** - Next.js with LocationClientProvider | Next.js 14+ | Server Actions, Maps |
| [vanilla-js-token](./web/vanilla-js-token) | Pure SPA with separate backend for tokens | Vanilla JS | Token caching |

### Mobile Samples (Coming Soon)

| Sample | Description | Platform |
|--------|-------------|----------|
| [react-native](./mobile/react-native) | React Native integration | iOS & Android |
| [ios-swift](./mobile/ios-swift) | Native iOS integration | iOS |
| [android-kotlin](./mobile/android-kotlin) | Native Android integration | Android |

## 🎯 Choose Your Sample

### I want to...

**Build a backend API**
→ Start with [nodejs-client-library](./backend/nodejs-client-library)

**Build a Next.js app**
→ Start with [nextjs-app-router](./web/nextjs-app-router)

**Build a pure SPA (React/Vue/Angular)**
→ Start with [vanilla-js-token](./web/vanilla-js-token)

**Use Direct Authentication (server-side only)**
→ See [nodejs-direct-auth](./backend/nodejs-direct-auth)

**Learn token caching manually**
→ See [nodejs-manual-token](./backend/nodejs-manual-token)

## 📚 Documentation

- [Setup Guide](https://docs.chaosity.cloud/docs/get-started/setup) - Get started in 5 minutes
- [Authentication](https://docs.chaosity.cloud/docs/authentication) - All authentication methods
- [Places API](https://docs.chaosity.cloud/api/places) - Geocoding and search
- [Maps API](https://docs.chaosity.cloud/api/maps) - Map tiles and styles

## 🔑 Getting Credentials

1. Receive invitation email from your organization
2. Create account and log in to your portal
3. Navigate to **Applications** → **Create Application**
4. Configure allowed domains
5. Copy your credentials:
   - API URL
   - Client ID
   - Client Secret

## 🛠️ Common Setup

All samples follow this pattern:

```bash
# 1. Clone the repository
git clone https://github.com/chaosity-io/location-service-samples.git
cd location-service-samples/[category]/[sample-name]

# 2. Copy environment template
cp .env.example .env

# 3. Add your credentials to .env
# LOCATION_API_URL=https://api.yourdomain.com
# LOCATION_CLIENT_ID=your_client_id
# LOCATION_CLIENT_SECRET=your_client_secret

# 4. Install dependencies
npm install  # or pip install -r requirements.txt

# 5. Run the sample
npm start    # or python app.py
```

## 🔒 Security Best Practices

- ✅ Store credentials in `.env` files (never commit)
- ✅ Use client libraries for automatic token management
- ✅ Keep credentials server-side only
- ✅ Configure allowed domains in portal
- ❌ Never expose credentials in frontend code
- ❌ Never commit `.env` files to version control

## 🤝 Contributing

Found a bug or want to add a sample? Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details

## 💬 Support

- **Documentation:** https://docs.chaosity.cloud
- **Issues:** https://github.com/chaosity-io/location-service-samples/issues
- **Email:** support@chaosity.cloud

---

## Sample Structure

Each sample includes:

```
sample-name/
├── src/                    # Source code
├── .env.example           # Credentials template
├── package.json           # Dependencies
├── README.md              # Setup instructions
└── .gitignore            # Git ignore rules
```

## Authentication Methods Comparison

| Method | Use Case | Complexity | Security |
|--------|----------|------------|----------|
| **Client Libraries** | Production apps | Low | High |
| **Direct Auth** | Backend services, scripts | Very Low | Medium |
| **Token-Based** | Frontend apps | Medium | High |

## Quick Links

- [Client Library (npm)](https://www.npmjs.com/package/@chaosity/location-client)
- [React Client (npm)](https://www.npmjs.com/package/@chaosity/location-client-react)
- [API Reference](https://docs.chaosity.cloud/api)
- [Changelog](./CHANGELOG.md)
