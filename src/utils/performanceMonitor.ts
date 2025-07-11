/**
 * Performance Monitoring Utility
 * Tracks application performance metrics and provides optimization insights
 */

import { PERFORMANCE_CONFIG } from '../config/constants'
import { ErrorHandler } from './errorHandler'

interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, any>
}

interface QueryPerformanceData {
  query: string
  duration: number
  timestamp: number
  success: boolean
  errorMessage?: string
  metadata?: Record<string, any>
}

interface ComponentPerformanceData {
  componentName: string
  renderTime: number
  timestamp: number
  props?: Record<string, any>
}

interface NetworkPerformanceData {
  url: string
  method: string
  duration: number
  status: number
  timestamp: number
  size?: number
}

interface PerformanceReport {
  averageQueryTime: number
  slowestQueries: QueryPerformanceData[]
  averageRenderTime: number
  slowestComponents: ComponentPerformanceData[]
  networkMetrics: {
    averageResponseTime: number
    slowestRequests: NetworkPerformanceData[]
    errorRate: number
  }
  memoryUsage?: {
    used: number
    total: number
    percentage: number
  }
  recommendations: string[]
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, PerformanceMetric> = new Map()
  private queryMetrics: QueryPerformanceData[] = []
  private componentMetrics: ComponentPerformanceData[] = []
  private networkMetrics: NetworkPerformanceData[] = []
  private isEnabled: boolean = true
  
  private constructor() {
    this.setupPerformanceObserver()
    this.setupMemoryMonitoring()
  }
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }
  
  /**
   * Enable or disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }
  
  /**
   * Start measuring a performance metric
   */
  startMeasure(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return
    
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    })
  }
  
  /**
   * End measuring a performance metric
   */
  endMeasure(name: string): number | null {
    if (!this.isEnabled) return null
    
    const metric = this.metrics.get(name)
    if (!metric) {
      console.warn(`Performance metric '${name}' not found`)
      return null
    }
    
    const endTime = performance.now()
    const duration = endTime - metric.startTime
    
    metric.endTime = endTime
    metric.duration = duration
    
    // Log slow operations
    if (duration > PERFORMANCE_CONFIG.SLOW_OPERATION_THRESHOLD) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`)
    }
    
    this.metrics.delete(name)
    return duration
  }
  
  /**
   * Measure a function execution time
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.isEnabled) return fn()
    
    this.startMeasure(name, metadata)
    try {
      const result = await fn()
      return result
    } finally {
      this.endMeasure(name)
    }
  }
  
  /**
   * Measure a synchronous function execution time
   */
  measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    if (!this.isEnabled) return fn()
    
    this.startMeasure(name, metadata)
    try {
      return fn()
    } finally {
      this.endMeasure(name)
    }
  }
  
  /**
   * Track database query performance
   */
  trackQuery(
    query: string,
    duration: number,
    success: boolean,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return
    
    const queryData: QueryPerformanceData = {
      query,
      duration,
      timestamp: Date.now(),
      success,
      errorMessage,
      metadata
    }
    
    this.queryMetrics.push(queryData)
    
    // Keep only recent metrics
    if (this.queryMetrics.length > PERFORMANCE_CONFIG.MAX_METRICS_HISTORY) {
      this.queryMetrics = this.queryMetrics.slice(-PERFORMANCE_CONFIG.MAX_METRICS_HISTORY)
    }
    
    // Log slow queries
    if (duration > PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD) {
      console.warn(`Slow query detected: ${query.substring(0, 100)}... took ${duration.toFixed(2)}ms`)
    }
  }
  
  /**
   * Track component render performance
   */
  trackComponentRender(
    componentName: string,
    renderTime: number,
    props?: Record<string, any>
  ): void {
    if (!this.isEnabled) return
    
    const componentData: ComponentPerformanceData = {
      componentName,
      renderTime,
      timestamp: Date.now(),
      props
    }
    
    this.componentMetrics.push(componentData)
    
    // Keep only recent metrics
    if (this.componentMetrics.length > PERFORMANCE_CONFIG.MAX_METRICS_HISTORY) {
      this.componentMetrics = this.componentMetrics.slice(-PERFORMANCE_CONFIG.MAX_METRICS_HISTORY)
    }
    
    // Log slow renders
    if (renderTime > PERFORMANCE_CONFIG.SLOW_RENDER_THRESHOLD) {
      console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`)
    }
  }
  
  /**
   * Track network request performance
   */
  trackNetworkRequest(
    url: string,
    method: string,
    duration: number,
    status: number,
    size?: number
  ): void {
    if (!this.isEnabled) return
    
    const networkData: NetworkPerformanceData = {
      url,
      method,
      duration,
      status,
      timestamp: Date.now(),
      size
    }
    
    this.networkMetrics.push(networkData)
    
    // Keep only recent metrics
    if (this.networkMetrics.length > PERFORMANCE_CONFIG.MAX_METRICS_HISTORY) {
      this.networkMetrics = this.networkMetrics.slice(-PERFORMANCE_CONFIG.MAX_METRICS_HISTORY)
    }
    
    // Log slow requests
    if (duration > PERFORMANCE_CONFIG.SLOW_NETWORK_THRESHOLD) {
      console.warn(`Slow network request: ${method} ${url} took ${duration.toFixed(2)}ms`)
    }
  }
  
  /**
   * Get performance report
   */
  getPerformanceReport(): PerformanceReport {
    const now = Date.now()
    const recentTimeframe = now - (24 * 60 * 60 * 1000) // Last 24 hours
    
    // Filter recent metrics
    const recentQueries = this.queryMetrics.filter(q => q.timestamp > recentTimeframe)
    const recentComponents = this.componentMetrics.filter(c => c.timestamp > recentTimeframe)
    const recentNetwork = this.networkMetrics.filter(n => n.timestamp > recentTimeframe)
    
    // Calculate averages
    const averageQueryTime = recentQueries.length > 0
      ? recentQueries.reduce((sum, q) => sum + q.duration, 0) / recentQueries.length
      : 0
    
    const averageRenderTime = recentComponents.length > 0
      ? recentComponents.reduce((sum, c) => sum + c.renderTime, 0) / recentComponents.length
      : 0
    
    const averageNetworkTime = recentNetwork.length > 0
      ? recentNetwork.reduce((sum, n) => sum + n.duration, 0) / recentNetwork.length
      : 0
    
    // Find slowest operations
    const slowestQueries = recentQueries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
    
    const slowestComponents = recentComponents
      .sort((a, b) => b.renderTime - a.renderTime)
      .slice(0, 5)
    
    const slowestRequests = recentNetwork
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
    
    // Calculate error rate
    const networkErrors = recentNetwork.filter(n => n.status >= 400).length
    const errorRate = recentNetwork.length > 0 ? (networkErrors / recentNetwork.length) * 100 : 0
    
    // Generate recommendations
    const recommendations = this.generateRecommendations({
      averageQueryTime,
      averageRenderTime,
      averageNetworkTime,
      errorRate,
      slowestQueries,
      slowestComponents
    })
    
    return {
      averageQueryTime,
      slowestQueries,
      averageRenderTime,
      slowestComponents,
      networkMetrics: {
        averageResponseTime: averageNetworkTime,
        slowestRequests,
        errorRate
      },
      memoryUsage: this.getMemoryUsage(),
      recommendations
    }
  }
  
  /**
   * Generate performance recommendations
   */
  private generateRecommendations(data: {
    averageQueryTime: number
    averageRenderTime: number
    averageNetworkTime: number
    errorRate: number
    slowestQueries: QueryPerformanceData[]
    slowestComponents: ComponentPerformanceData[]
  }): string[] {
    const recommendations: string[] = []
    
    // Query performance recommendations
    if (data.averageQueryTime > PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD) {
      recommendations.push('Consider optimizing database queries - average query time is high')
      recommendations.push('Add database indexes for frequently queried columns')
      recommendations.push('Implement query result caching')
    }
    
    // Render performance recommendations
    if (data.averageRenderTime > PERFORMANCE_CONFIG.SLOW_RENDER_THRESHOLD) {
      recommendations.push('Optimize component rendering - consider using React.memo for expensive components')
      recommendations.push('Implement virtual scrolling for large lists')
      recommendations.push('Use useMemo and useCallback to prevent unnecessary re-renders')
    }
    
    // Network performance recommendations
    if (data.averageNetworkTime > PERFORMANCE_CONFIG.SLOW_NETWORK_THRESHOLD) {
      recommendations.push('Optimize network requests - consider request batching')
      recommendations.push('Implement request caching and compression')
      recommendations.push('Use CDN for static assets')
    }
    
    // Error rate recommendations
    if (data.errorRate > 5) {
      recommendations.push('High network error rate detected - implement better error handling and retry logic')
    }
    
    // Specific component recommendations
    const problematicComponents = data.slowestComponents.filter(
      c => c.renderTime > PERFORMANCE_CONFIG.SLOW_RENDER_THRESHOLD
    )
    if (problematicComponents.length > 0) {
      const componentNames = problematicComponents.map(c => c.componentName).join(', ')
      recommendations.push(`Optimize these slow components: ${componentNames}`)
    }
    
    // Memory recommendations
    const memoryUsage = this.getMemoryUsage()
    if (memoryUsage && memoryUsage.percentage > 80) {
      recommendations.push('High memory usage detected - check for memory leaks')
      recommendations.push('Implement proper cleanup in useEffect hooks')
    }
    
    return recommendations
  }
  
  /**
   * Get memory usage information
   */
  private getMemoryUsage(): { used: number; total: number; percentage: number } | undefined {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      }
    }
    return undefined
  }
  
  /**
   * Setup performance observer for navigation timing
   */
  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming
              console.log('Page load performance:', {
                domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
                loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
                totalTime: navEntry.loadEventEnd - navEntry.fetchStart
              })
            }
          }
        })
        
        observer.observe({ entryTypes: ['navigation', 'measure'] })
      } catch (error) {
        console.warn('Performance observer not supported:', error)
      }
    }
  }
  
  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(): void {
    if (PERFORMANCE_CONFIG.MEMORY_MONITORING_ENABLED) {
      setInterval(() => {
        const memoryUsage = this.getMemoryUsage()
        if (memoryUsage && memoryUsage.percentage > 90) {
          console.warn('High memory usage detected:', memoryUsage)
          ErrorHandler.logError(
            new Error('High memory usage detected'),
            {
              operation: 'memory_monitoring',
              metadata: { memoryUsage }
            }
          )
        }
      }, PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL)
    }
  }
  
  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear()
    this.queryMetrics = []
    this.componentMetrics = []
    this.networkMetrics = []
  }
  
  /**
   * Export metrics for analysis
   */
  exportMetrics(): {
    queries: QueryPerformanceData[]
    components: ComponentPerformanceData[]
    network: NetworkPerformanceData[]
  } {
    return {
      queries: [...this.queryMetrics],
      components: [...this.componentMetrics],
      network: [...this.networkMetrics]
    }
  }
}

// Singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// Utility functions for easy access
export const PerformanceUtils = {
  /**
   * Measure async operation
   */
  measureAsync: <T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>) =>
    performanceMonitor.measureAsync(name, fn, metadata),
  
  /**
   * Measure sync operation
   */
  measureSync: <T>(name: string, fn: () => T, metadata?: Record<string, any>) =>
    performanceMonitor.measureSync(name, fn, metadata),
  
  /**
   * Track query performance
   */
  trackQuery: (query: string, duration: number, success: boolean, errorMessage?: string, metadata?: Record<string, any>) =>
    performanceMonitor.trackQuery(query, duration, success, errorMessage, metadata),
  
  /**
   * Track component render
   */
  trackRender: (componentName: string, renderTime: number, props?: Record<string, any>) =>
    performanceMonitor.trackComponentRender(componentName, renderTime, props),
  
  /**
   * Track network request
   */
  trackNetwork: (url: string, method: string, duration: number, status: number, size?: number) =>
    performanceMonitor.trackNetworkRequest(url, method, duration, status, size),
  
  /**
   * Get performance report
   */
  getReport: () => performanceMonitor.getPerformanceReport(),
  
  /**
   * Enable/disable monitoring
   */
  setEnabled: (enabled: boolean) => performanceMonitor.setEnabled(enabled)
}

export default performanceMonitor