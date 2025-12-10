# Location Service Samples

Live examples demonstrating Chaosity Location Service integration across multiple platforms and frameworks.

## 🚀 Quick Start

All samples require API credentials:

1. **Sign up** at [portal.chaosity.io](https://portal.chaosity.io)
2. **Copy** `.env.example` to `.env.local` in the sample directory
3. **Add** your credentials to `.env.local`
4. **Run** `npm install && npm run dev` (or framework-specific command)

## 📁 Repository Structure

```
location-service-samples/
├── web/                    # Web applications
│   ├── javascript-vanilla/ # Pure JavaScript (no framework)
│   ├── react/             # React applications
│   ├── vue/               # Vue.js applications
│   ├── nextjs/            # Next.js applications
│   └── angular/           # Angular applications
├── mobile/                # Mobile applications
│   ├── react-native/      # React Native (iOS & Android)
│   ├── ios-swift/         # Native iOS (Swift)
│   └── android-kotlin/    # Native Android (Kotlin)
└── backend/               # Backend integrations
    ├── nodejs-express/    # Node.js + Express
    ├── python-fastapi/    # Python + FastAPI
    └── java-spring/       # Java + Spring Boot
```

## 🌐 Web Samples

### JavaScript (Vanilla)

Pure JavaScript examples with no framework dependencies.

- **[maps-simple](./web/javascript-vanilla/maps-simple)** - Basic map display with MapLibre GL
- **[maps-advanced](./web/javascript-vanilla/maps-advanced)** - Markers, popups, custom controls
- **[address-autocomplete](./web/javascript-vanilla/address-autocomplete)** - Search-as-you-type address finder
- **[address-validation](./web/javascript-vanilla/address-validation)** - Validate and standardize addresses
- **[ecommerce-checkout](./web/javascript-vanilla/ecommerce-checkout)** - Complete checkout flow with address validation

### React

React applications using `@chaosity/location-client-react`.

- **[maps-simple](./web/react/maps-simple)** - Basic map with React hooks
- **[maps-advanced](./web/react/maps-advanced)** - Interactive map with state management
- **[address-autocomplete](./web/react/address-autocomplete)** - Address search component
- **[address-validation](./web/react/address-validation)** - Form validation with address verification
- **[ecommerce-checkout](./web/react/ecommerce-checkout)** - Full checkout experience
- **[store-locator](./web/react/store-locator)** - Find nearest store locations

### Vue.js

*Coming soon...*

### Next.js

*Coming soon...*

### Angular

*Coming soon...*

## 📱 Mobile Samples

### React Native

Cross-platform mobile apps for iOS and Android.

- **[maps-simple](./mobile/react-native/maps-simple)** - Basic map display
- **[store-locator](./mobile/react-native/store-locator)** - Find nearby stores with directions
- **[delivery-tracking](./mobile/react-native/delivery-tracking)** - Real-time delivery tracking
- **[address-autocomplete](./mobile/react-native/address-autocomplete)** - Mobile address search

### iOS (Swift)

*Coming soon...*

### Android (Kotlin)

*Coming soon...*

## 🔧 Backend Samples

### Node.js + Express

*Coming soon...*

### Python + FastAPI

*Coming soon...*

### Java + Spring Boot

*Coming soon...*

## 🎯 Samples by Use Case

| Use Case | Vanilla JS | React | Vue | Next.js | React Native | iOS | Android |
|----------|------------|-------|-----|---------|--------------|-----|---------|
| **Display Maps** | ✅ | ✅ | 🔜 | 🔜 | ✅ | 🔜 | 🔜 |
| **Address Autocomplete** | ✅ | ✅ | 🔜 | 🔜 | ✅ | 🔜 | 🔜 |
| **Address Validation** | ✅ | ✅ | 🔜 | 🔜 | 🔜 | 🔜 | 🔜 |
| **Geocoding** | ✅ | ✅ | 🔜 | 🔜 | 🔜 | 🔜 | 🔜 |
| **Reverse Geocoding** | ✅ | ✅ | 🔜 | 🔜 | 🔜 | 🔜 | 🔜 |
| **Store Locator** | 🔜 | ✅ | 🔜 | 🔜 | ✅ | 🔜 | 🔜 |
| **E-commerce Checkout** | ✅ | ✅ | 🔜 | 🔜 | 🔜 | 🔜 | 🔜 |
| **Delivery Tracking** | 🔜 | 🔜 | 🔜 | 🔜 | ✅ | 🔜 | 🔜 |

✅ Available | 🔜 Coming Soon

## 📚 Documentation & Resources

- **[API Documentation](https://docs.chaosity.io)** - Complete API reference
- **[NPM Packages](https://www.npmjs.com/org/chaosity)** - Published libraries
- **[Developer Portal](https://portal.chaosity.io)** - Get API credentials
- **[Marketing Site](https://chaosity.io)** - Product information

## 🤝 Contributing

We welcome sample contributions! Each sample should:

1. Be self-contained and runnable
2. Include a detailed README
3. Have `.env.example` with required variables
4. Follow framework best practices
5. Include a screenshot or demo GIF

## 📝 Sample Template

Each sample directory should contain:

```
sample-name/
├── README.md              # What it demonstrates, how to run
├── package.json           # Dependencies (if applicable)
├── .env.example           # Required environment variables
├── .gitignore            # Ignore node_modules, .env.local, etc.
├── src/                   # Source code
├── public/                # Static assets
└── screenshot.png         # Visual preview
```

## 🔐 Security

- Never commit `.env.local` or actual credentials
- All samples use `.env.example` as template
- Credentials should be obtained from [portal.chaosity.io](https://portal.chaosity.io)

## 📄 License

MIT - See individual sample directories for specific licenses.
