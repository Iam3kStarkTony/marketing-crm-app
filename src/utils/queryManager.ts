/**
 * Centralized Query Management with Timeout and Retry Logic
 * Addresses timeout issues and provides consistent error handling
 */

export interface QueryOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
  operation?: string
}

export interface RetryOptions {
  maxRetries: number
  baseDelay: number
  maxDelay?: number
  exponentialBackoff?: boolean
}

export class QueryManager {
  // Centralized timeout constants
  static readonly TIMEOUTS = {
    PROFILE_FETCH: 5000,
    TASK_QUERY: 12000,
    CLIENT_QUERY: 12000,
    ANALYTICS: 15000,
    DEFAULT: 10000,
    QUICK: 3000
  } as const

  /**
   * Execute a promise with timeout protection
   */
  static async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string = 'Operation'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`${operation} timeout after ${timeoutMs}ms`))
      }, timeoutMs)
      
      // Ensure timeout is cleared if promise resolves first
      promise.finally(() => clearTimeout(timeoutId))
    })

    return Promise.race([promise, timeoutPromise])
  }

  /**
   * Execute a promise with retry logic and exponential backoff
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    const { maxRetries, baseDelay, maxDelay = 30000, exponentialBackoff = true } = options
    
    let lastError: Error
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break
        }
        
        // Calculate delay with exponential backoff
        const delay = exponentialBackoff 
          ? Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
          : baseDelay
        
        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000
        
        console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(jitteredDelay)}ms:`, error)
        
        await this.delay(jitteredDelay)
      }
    }
    
    throw lastError!
  }

  /**
   * Execute a promise with both timeout and retry protection
   */
  static async withTimeoutAndRetry<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    retryOptions: RetryOptions,
    operationName: string = 'Operation'
  ): Promise<T> {
    return this.withRetry(
      () => this.withTimeout(operation(), timeoutMs, operationName),
      retryOptions
    )
  }

  /**
   * Create a Supabase query with timeout protection
   */
  static async executeSupabaseQuery<T>(
    queryBuilder: any,
    options: QueryOptions = {}
  ): Promise<{ data: T | null; error: any }> {
    const {
      timeout = this.TIMEOUTS.DEFAULT,
      retries = 2,
      retryDelay = 1000,
      operation = 'Supabase query'
    } = options

    try {
      if (retries > 0) {
        return await this.withTimeoutAndRetry(
          () => queryBuilder,
          timeout,
          { maxRetries: retries, baseDelay: retryDelay },
          operation
        )
      } else {
        return await this.withTimeout(queryBuilder, timeout, operation)
      }
    } catch (error) {
      console.error(`${operation} failed:`, error)
      return { data: null, error }
    }
  }

  /**
   * Utility function to create delay
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Check if an error is retryable
   */
  static isRetryableError(error: Error): boolean {
    const retryableMessages = [
      'timeout',
      'network',
      'connection',
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED'
    ]
    
    const errorMessage = error.message.toLowerCase()
    return retryableMessages.some(msg => errorMessage.includes(msg))
  }

  /**
   * Create a timeout promise for manual use
   */
  static createTimeoutPromise(ms: number, operation: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operation} timeout after ${ms}ms`))
      }, ms)
    })
  }

  /**
   * Batch execute multiple queries with individual timeout protection
   */
  static async executeBatch<T>(
    queries: Array<() => Promise<T>>,
    options: QueryOptions = {}
  ): Promise<Array<{ success: boolean; data?: T; error?: Error }>> {
    const { timeout = this.TIMEOUTS.DEFAULT } = options
    
    const results = await Promise.allSettled(
      queries.map((query, index) => 
        this.withTimeout(query(), timeout, `Batch query ${index + 1}`)
      )
    )
    
    return results.map(result => {
      if (result.status === 'fulfilled') {
        return { success: true, data: result.value }
      } else {
        return { success: false, error: result.reason }
      }
    })
  }
}

/**
 * Specialized query helpers for common operations
 */
export class SupabaseQueryHelper {
  /**
   * Execute a profile fetch with appropriate timeout
   */
  static async fetchProfile(supabase: any, userId: string) {
    return QueryManager.executeSupabaseQuery(
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      {
        timeout: QueryManager.TIMEOUTS.PROFILE_FETCH,
        operation: 'Profile fetch',
        retries: 2
      }
    )
  }

  /**
   * Execute a task query with appropriate timeout
   */
  static async fetchTasks(supabase: any, query: any) {
    return QueryManager.executeSupabaseQuery(
      query,
      {
        timeout: QueryManager.TIMEOUTS.TASK_QUERY,
        operation: 'Task query',
        retries: 1
      }
    )
  }

  /**
   * Execute a client query with appropriate timeout
   */
  static async fetchClients(supabase: any, query: any) {
    return QueryManager.executeSupabaseQuery(
      query,
      {
        timeout: QueryManager.TIMEOUTS.CLIENT_QUERY,
        operation: 'Client query',
        retries: 1
      }
    )
  }
}