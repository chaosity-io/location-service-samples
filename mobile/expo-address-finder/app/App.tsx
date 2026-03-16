import { LocationClientProvider } from '@chaosity/location-client-react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView, StyleSheet } from 'react-native'
import AddressFinder from './src/components/AddressFinder'
import { getConfig } from './src/lib/getConfig'

export default function App() {
  return (
    <LocationClientProvider getConfig={getConfig} refreshBuffer={120}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <AddressFinder />
      </SafeAreaView>
    </LocationClientProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
})
