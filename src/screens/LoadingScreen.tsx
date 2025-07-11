import React from 'react'
import { View, StyleSheet } from 'react-native'
import { ActivityIndicator, Text, ProgressBar } from 'react-native-paper'
import { useTheme } from '../contexts/ThemeContext'

interface LoadingScreenProps {
  message?: string
  progress?: number
  showProgress?: boolean
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...', 
  progress = 0, 
  showProgress = false 
}) => {
  const { theme } = useTheme()
  const styles = createStyles(theme)
  
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.text}>{message}</Text>
      {showProgress && (
        <View style={styles.progressContainer}>
          <ProgressBar 
            progress={progress} 
            color={theme.colors.primary}
            style={styles.progressBar}
          />
          <Text style={styles.progressText}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
      )}
    </View>
  )
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 32,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.onBackground,
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: 24,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.onBackground,
    opacity: 0.7,
  },
})

export default LoadingScreen