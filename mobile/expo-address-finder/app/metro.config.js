// @chaosity/location-client uses the AWS SDK, whose React Native runtime
// config is mapped for its ES build ("module") only. Metro's default fields
// stop at "main", the Node build, which imports node:https; "module" first
// reaches the ES build, and the package's "react-native" map applies.
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
config.resolver.resolverMainFields = [
  'react-native',
  'browser',
  'module',
  'main',
]

module.exports = config
