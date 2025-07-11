/**
 * Application Configuration Constants
 * Centralized configuration for timeouts, retries, and other app settings
 */

// API Configuration
export const API_CONFIG = {
  // Timeout settings (in milliseconds)
  TIMEOUTS: {
    DEFAULT: 10000,           // 10 seconds - default for most operations
    PROFILE_FETCH: 5000,      // 5 seconds - user profile queries
    TASK_QUERY: 12000,        // 12 seconds - task-related queries
    CLIENT_QUERY: 12000,      // 12 seconds - client-related queries
    ANALYTICS: 15000,         // 15 seconds - analytics and reporting
    AUTH: 8000,               // 8 seconds - authentication operations
    FILE_UPLOAD: 30000,       // 30 seconds - file upload operations
    QUICK_OPERATION: 3000,    // 3 seconds - quick operations
    SYNC: 20000,              // 20 seconds - data synchronization
  },

  // Retry configuration
  RETRY: {
    DEFAULT_ATTEMPTS: 3,
    QUICK_ATTEMPTS: 1,
    CRITICAL_ATTEMPTS: 5,
    BASE_DELAY: 1000,         // 1 second base delay
    MAX_DELAY: 30000,         // 30 seconds max delay
    EXPONENTIAL_BACKOFF: true,
  },

  // Rate limiting
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: 60,
    BURST_LIMIT: 10,
  },

  // Cache settings
  CACHE: {
    PROFILE_TTL: 5 * 60 * 1000,      // 5 minutes
    TASKS_TTL: 2 * 60 * 1000,        // 2 minutes
    CLIENTS_TTL: 10 * 60 * 1000,     // 10 minutes
    ANALYTICS_TTL: 15 * 60 * 1000,   // 15 minutes
  },
} as const

// Database Configuration
export const DB_CONFIG = {
  // Query limits
  QUERY_LIMITS: {
    TASKS_DEFAULT: 50,
    TASKS_DASHBOARD: 10,
    CLIENTS_DEFAULT: 20,
    CLIENTS_DASHBOARD: 5,
    MESSAGES_DEFAULT: 100,
    ANALYTICS_DEFAULT: 1000,
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },

  // Real-time subscriptions
  REALTIME: {
    RECONNECT_DELAY: 5000,
    MAX_RECONNECT_ATTEMPTS: 10,
  },
} as const

// UI Configuration
export const UI_CONFIG = {
  // Loading states
  LOADING: {
    MIN_DISPLAY_TIME: 500,    // Minimum time to show loading spinner
    SKELETON_DELAY: 200,      // Delay before showing skeleton
  },

  // Animations
  ANIMATIONS: {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
  },

  // Debounce delays
  DEBOUNCE: {
    SEARCH: 300,
    INPUT: 500,
    RESIZE: 250,
  },

  // Toast notifications
  TOAST: {
    SUCCESS_DURATION: 3000,
    ERROR_DURATION: 5000,
    WARNING_DURATION: 4000,
  },
} as const

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: true,
  ENABLE_PUSH_NOTIFICATIONS: true,
  ENABLE_OFFLINE_MODE: true,
  ENABLE_REAL_TIME: true,
  ENABLE_FILE_UPLOAD: true,
  ENABLE_ADVANCED_SEARCH: true,
  ENABLE_DARK_MODE: true,
  ENABLE_ERROR_REPORTING: true,
} as const

// Environment-specific settings
export const ENV_CONFIG = {
  IS_DEVELOPMENT: __DEV__,
  IS_PRODUCTION: !__DEV__,
  
  // Logging levels
  LOG_LEVEL: __DEV__ ? 'debug' : 'error',
  
  // Debug features
  ENABLE_DEBUG_LOGS: __DEV__,
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_ERROR_BOUNDARY: true,
} as const

// Security Configuration
export const SECURITY_CONFIG = {
  // Session management
  SESSION: {
    REFRESH_THRESHOLD: 5 * 60 * 1000,  // Refresh token 5 minutes before expiry
    MAX_IDLE_TIME: 30 * 60 * 1000,     // 30 minutes max idle time
  },

  // Input validation
  VALIDATION: {
    MAX_FILE_SIZE: 10 * 1024 * 1024,   // 10MB
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'],
    MAX_TEXT_LENGTH: 10000,
  },

  // Rate limiting for security
  SECURITY_LIMITS: {
    LOGIN_ATTEMPTS: 5,
    PASSWORD_RESET_ATTEMPTS: 3,
    API_CALLS_PER_HOUR: 1000,
  },
} as const

// Performance Configuration
export const PERFORMANCE_CONFIG = {
  // Bundle splitting
  LAZY_LOAD_THRESHOLD: 1000,  // Components larger than 1KB should be lazy loaded
  
  // Memory management
  MAX_CACHE_SIZE: 50 * 1024 * 1024,  // 50MB max cache size
  
  // Network optimization
  PREFETCH_DELAY: 2000,       // Delay before prefetching data
  
  // Image optimization
  IMAGE_QUALITY: 0.8,         // 80% quality for compressed images
  MAX_IMAGE_DIMENSION: 1920,  // Max width/height for images
} as const

// Error Handling Configuration
export const ERROR_CONFIG = {
  // Error reporting
  REPORT_ERRORS: !__DEV__,
  
  // Error categories
  CATEGORIES: {
    NETWORK: 'network',
    TIMEOUT: 'timeout',
    AUTH: 'auth',
    VALIDATION: 'validation',
    DATABASE: 'database',
    UNKNOWN: 'unknown',
  },
  
  // Error severity levels
  SEVERITY: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  },
} as const

// Export all configurations as a single object for convenience
export const APP_CONFIG = {
  API: API_CONFIG,
  DB: DB_CONFIG,
  UI: UI_CONFIG,
  FEATURES: FEATURE_FLAGS,
  ENV: ENV_CONFIG,
  SECURITY: SECURITY_CONFIG,
  PERFORMANCE: PERFORMANCE_CONFIG,
  ERROR: ERROR_CONFIG,
} as const

// Type definitions for better TypeScript support
export type ApiTimeout = keyof typeof API_CONFIG.TIMEOUTS
export type FeatureFlag = keyof typeof FEATURE_FLAGS
export type ErrorCategory = typeof ERROR_CONFIG.CATEGORIES[keyof typeof ERROR_CONFIG.CATEGORIES]
export type ErrorSeverity = typeof ERROR_CONFIG.SEVERITY[keyof typeof ERROR_CONFIG.SEVERITY]