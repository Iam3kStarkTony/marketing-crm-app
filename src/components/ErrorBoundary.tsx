import React, { Component, ReactNode } from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, Button, Card } from 'react-native-paper'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <View style={styles.container}>
          <Card style={styles.errorCard}>
            <Card.Content style={styles.errorContent}>
              <Text variant="headlineSmall" style={styles.errorTitle}>
                Oops! Something went wrong
              </Text>
              <Text variant="bodyMedium" style={styles.errorMessage}>
                We encountered an unexpected error. Please try again.
              </Text>
              {__DEV__ && this.state.error && (
                <Text variant="bodySmall" style={styles.errorDetails}>
                  {this.state.error.message}
                </Text>
              )}
              <Button
                mode="contained"
                onPress={this.handleRetry}
                style={styles.retryButton}
              >
                Try Again
              </Button>
            </Card.Content>
          </Card>
        </View>
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F2F2F7',
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
    elevation: 4,
  },
  errorContent: {
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#FF3B30',
  },
  errorMessage: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
  errorDetails: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#999',
    fontFamily: 'monospace',
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 4,
  },
  retryButton: {
    marginTop: 8,
  },
})

export default ErrorBoundary