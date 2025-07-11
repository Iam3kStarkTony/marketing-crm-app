/**
 * Centralized Error Handling System
 * Provides consistent error logging, user-friendly messages, and error classification
 */

import { AnalyticsService } from '../services/analytics'

export interface ErrorContext {
  userId?: string
  screen?: string
  operation?: string
  metadata?: Record<string, any>
}

export interface ErrorInfo {
  message: string
  userFriendlyMessage: string
  isRetryable: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'network' | 'timeout' | 'auth' | 'validation' | 'unknown'
}

export class ErrorHandler {
  private static readonly ERROR_PATTERNS = {
    timeout: /timeout|timed out/i,
    network: /network|connection|fetch|ECONNRESET|ENOTFOUND|ECONNREFUSED/i,
    auth: /auth|unauthorized|forbidden|token|session/i,
    validation: /validation|invalid|required|missing/i,
    database: /database|sql|constraint|foreign key/i,
    rls: /row level security|rls|policy/i
  }

  private static readonly USER_FRIENDLY_MESSAGES = {
    timeout: 'The request is taking longer than expected. Please try again.',
    network: 'Unable to connect to the server. Please check your internet connection.',
    auth: 'Your session has expired. Please log in again.',
    validation: 'Please check your input and try again.',
    database: 'A database error occurred. Please try again later.',
    rls: 'You do not have permission to access this data.',
    unknown: 'An unexpected error occurred. Please try again.'
  }

  /**
   * Log error with context and analytics
   */
  static async logError(
    error: Error,
    context: ErrorContext = {}
  ): Promise<void> {
    const errorInfo = this.analyzeError(error)
    const timestamp = new Date().toISOString()
    
    // Console logging with structured format
    console.error('🚨 Error logged:', {
      timestamp,
      message: error.message,
      stack: error.stack,
      context,
      errorInfo
    })

    // Track error in analytics (non-blocking)
    try {
      if (context.userId) {
        await AnalyticsService.trackEvent(context.userId, 'error_occurred', {
          error_message: error.message,
          error_category: errorInfo.category,
          error_severity: errorInfo.severity,
          screen: context.screen,
          operation: context.operation,
          ...context.metadata
        })
      }
    } catch (analyticsError) {
      console.warn('Failed to track error in analytics:', analyticsError)
    }

    // In production, you might want to send to external error tracking service
    if (__DEV__ === false && errorInfo.severity === 'critical') {
      // Example: Sentry, Bugsnag, etc.
      // await ExternalErrorService.captureError(error, context)
    }
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: Error): string {
    const errorInfo = this.analyzeError(error)
    return errorInfo.userFriendlyMessage
  }

  /**
   * Check if error should trigger a retry
   */
  static isRetryableError(error: Error): boolean {
    const errorInfo = this.analyzeError(error)
    return errorInfo.isRetryable
  }

  /**
   * Analyze error and categorize it
   */
  static analyzeError(error: Error): ErrorInfo {
    const message = error.message.toLowerCase()
    
    // Determine category
    let category: ErrorInfo['category'] = 'unknown'
    for (const [cat, pattern] of Object.entries(this.ERROR_PATTERNS)) {
      if (pattern.test(message)) {
        category = cat as ErrorInfo['category']
        break
      }
    }

    // Determine severity
    const severity = this.determineSeverity(error, category)
    
    // Determine if retryable
    const isRetryable = this.determineRetryability(category, message)
    
    // Get user-friendly message
    const userFriendlyMessage = this.USER_FRIENDLY_MESSAGES[category] || this.USER_FRIENDLY_MESSAGES.unknown

    return {
      message: error.message,
      userFriendlyMessage,
      isRetryable,
      severity,
      category
    }
  }

  /**
   * Determine error severity
   */
  private static determineSeverity(
    error: Error, 
    category: ErrorInfo['category']
  ): ErrorInfo['severity'] {
    const message = error.message.toLowerCase()
    
    // Critical errors
    if (category === 'auth' || message.includes('critical') || message.includes('fatal')) {
      return 'critical'
    }
    
    // High severity errors
    if (category === 'database' || category === 'rls' || message.includes('constraint')) {
      return 'high'
    }
    
    // Medium severity errors
    if (category === 'validation' || category === 'network') {
      return 'medium'
    }
    
    // Low severity errors (timeouts, temporary issues)
    return 'low'
  }

  /**
   * Determine if error is retryable
   */
  private static determineRetryability(
    category: ErrorInfo['category'],
    message: string
  ): boolean {
    // Always retryable
    if (category === 'timeout' || category === 'network') {
      return true
    }
    
    // Never retryable
    if (category === 'auth' || category === 'validation' || category === 'rls') {
      return false
    }
    
    // Database errors might be retryable depending on type
    if (category === 'database') {
      const nonRetryableDbErrors = ['constraint', 'foreign key', 'unique', 'duplicate']
      return !nonRetryableDbErrors.some(pattern => message.includes(pattern))
    }
    
    // Default to retryable for unknown errors
    return true
  }

  /**
   * Handle error with automatic logging and user notification
   */
  static async handleError(
    error: Error,
    context: ErrorContext = {},
    showToUser: boolean = true
  ): Promise<ErrorInfo> {
    // Log the error
    await this.logError(error, context)
    
    // Analyze error
    const errorInfo = this.analyzeError(error)
    
    // Show user notification if requested
    if (showToUser) {
      // In a real app, you might use a toast notification service
      console.warn('User notification:', errorInfo.userFriendlyMessage)
    }
    
    return errorInfo
  }

  /**
   * Create a standardized error for common scenarios
   */
  static createError(
    type: 'timeout' | 'network' | 'auth' | 'validation',
    operation: string,
    details?: string
  ): Error {
    const messages = {
      timeout: `${operation} timeout${details ? `: ${details}` : ''}`,
      network: `Network error during ${operation}${details ? `: ${details}` : ''}`,
      auth: `Authentication error during ${operation}${details ? `: ${details}` : ''}`,
      validation: `Validation error during ${operation}${details ? `: ${details}` : ''}`
    }
    
    return new Error(messages[type])
  }

  /**
   * Wrap async operations with error handling
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    fallbackValue?: T
  ): Promise<T | undefined> {
    try {
      return await operation()
    } catch (error) {
      await this.handleError(error as Error, context)
      return fallbackValue
    }
  }

  /**
   * Create error boundary for React components
   */
  static createErrorBoundary(componentName: string) {
    return {
      componentDidCatch: (error: Error, errorInfo: any) => {
        this.logError(error, {
          screen: componentName,
          operation: 'component_render',
          metadata: { errorInfo }
        })
      }
    }
  }
}

/**
 * Utility functions for common error scenarios
 */
export class ErrorUtils {
  /**
   * Handle Supabase errors specifically
   */
  static handleSupabaseError(error: any, operation: string): Error {
    if (error?.message) {
      return new Error(`${operation}: ${error.message}`)
    }
    
    if (error?.error_description) {
      return new Error(`${operation}: ${error.error_description}`)
    }
    
    return new Error(`${operation}: Unknown Supabase error`)
  }

  /**
   * Handle network/fetch errors
   */
  static handleNetworkError(error: any, operation: string): Error {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return ErrorHandler.createError('network', operation, 'Failed to fetch')
    }
    
    if (error.code === 'NETWORK_ERROR') {
      return ErrorHandler.createError('network', operation, 'Network unavailable')
    }
    
    return new Error(`${operation}: ${error.message || 'Network error'}`)
  }

  /**
   * Handle timeout errors
   */
  static handleTimeoutError(operation: string, timeoutMs: number): Error {
    return ErrorHandler.createError('timeout', operation, `Exceeded ${timeoutMs}ms`)
  }
}