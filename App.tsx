import React, { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { PaperProvider } from 'react-native-paper'
import { NavigationContainer } from '@react-navigation/native'
import { AuthProvider } from './src/contexts/AuthContext'
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext'
import AppNavigator from './src/navigation/AppNavigator'
import ErrorBoundary from './src/components/ErrorBoundary'
import { PushNotificationService } from './src/services/pushNotifications'

// Inner app component that uses theme
const AppContent: React.FC = () => {
  const { theme, isDark } = useTheme()

  useEffect(() => {
    // Initialize push notifications
    const initializePushNotifications = async () => {
      try {
        const token = await PushNotificationService.registerForPushNotifications()
        if (token) {
          console.log('Push notification token registered:', token)
        }
      } catch (error) {
        console.error('Error initializing push notifications:', error)
      }
    }

    initializePushNotifications()
  }, [])

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <AuthProvider>
            <AppNavigator />
            <StatusBar style={isDark ? 'light' : 'dark'} />
          </AuthProvider>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  )
}
