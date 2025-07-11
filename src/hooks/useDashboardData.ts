/**
 * Custom Hook for Dashboard Data Management
 * Consolidates all dashboard-related data fetching and state management
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { QueryManager, SupabaseQueryHelper } from '../utils/queryManager'
import { ErrorHandler, ErrorContext } from '../utils/errorHandler'
import { API_CONFIG } from '../config/constants'
import { AnalyticsService } from '../services/analytics'
import { DataSynchronizationService } from '../services/dataSynchronization'
import { supabase, getUserProfile } from '../services/supabase'
import { TaskWithRelations } from '../types/database'

export interface DashboardData {
  metrics: any
  dashboardMetrics: any
  clientInsights: any
  taskInsights: any
  syncStatus: any
  taskCounts: {
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    pendingTasks: number
  }
  taskCompletionRate: {
    labels: string[]
    completionRates: number[]
  }
}

export interface LoadingStates {
  profile: boolean
  tasks: boolean
  clients: boolean
  analytics: boolean
  tomorrowTasks: boolean
  taskProgress: boolean
}

export interface DashboardState {
  // Data
  dashboardData: DashboardData | null
  tasks: TaskWithRelations[]
  clients: any[]
  tomorrowTasks: any[]
  userRole: string
  taskProgress: {
    completed: number
    inProgress: number
    pending: number
    total: number
    completionPercentage: number
  }
  
  // Loading states
  loading: boolean
  refreshing: boolean
  loadingStates: LoadingStates
  
  // Error states
  errors: Record<string, Error | null>
  
  // Actions
  refresh: () => Promise<void>
  loadTasks: (userRole?: string) => Promise<TaskWithRelations[]>
  loadClients: (userRole?: string) => Promise<any[]>
  loadTomorrowTasks: () => Promise<any[]>
  calculateTaskProgress: () => Promise<void>
  clearErrors: () => void
}

type TimePeriod = '30d' | '90d' | '6m' | '1y'

export function useDashboardData(timePeriod: TimePeriod = '30d'): DashboardState {
  const { user } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [tomorrowTasks, setTomorrowTasks] = useState<any[]>([])
  const [userRole, setUserRole] = useState<string>('agent')
  const [taskProgress, setTaskProgress] = useState({
    completed: 0,
    inProgress: 0,
    pending: 0,
    total: 0,
    completionPercentage: 0
  })
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    profile: false,
    tasks: false,
    clients: false,
    analytics: false,
    tomorrowTasks: false,
    taskProgress: false
  })
  
  const [errors, setErrors] = useState<Record<string, Error | null>>({})
  
  // Cache for user profile to avoid repeated fetches
  const userProfileCache = useRef<{ data: any; timestamp: number } | null>(null)
  const CACHE_DURATION = API_CONFIG.CACHE.PROFILE_TTL
  
  // Error context for logging
  const getErrorContext = useCallback((operation: string): ErrorContext => ({
    userId: user?.id,
    screen: 'DashboardScreen',
    operation,
    metadata: { userRole, timePeriod }
  }), [user?.id, userRole, timePeriod])
  
  // Clear specific error
  const clearError = useCallback((key: string) => {
    setErrors(prev => ({ ...prev, [key]: null }))
  }, [])
  
  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])
  
  // Set loading state for specific operation
  const setLoadingState = useCallback((key: keyof LoadingStates, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }))
  }, [])
  
  // Set error for specific operation
  const setError = useCallback((key: string, error: Error | null) => {
    setErrors(prev => ({ ...prev, [key]: error }))
    if (error) {
      ErrorHandler.logError(error, getErrorContext(key))
    }
  }, [getErrorContext])
  
  // Get cached user profile or fetch new one
  const getUserRoleWithCache = useCallback(async (): Promise<string> => {
    if (!user) return 'agent'
    
    // Check cache first
    const now = Date.now()
    if (userProfileCache.current && 
        (now - userProfileCache.current.timestamp) < CACHE_DURATION) {
      return userProfileCache.current.data?.role || 'agent'
    }
    
    setLoadingState('profile', true)
    clearError('profile')
    
    try {
      const { data, error } = await SupabaseQueryHelper.fetchProfile(supabase, user.id)
      
      if (error) {
        throw new Error(`Profile fetch failed: ${error.message || error}`)
      }
      
      const role = data?.role || 'agent'
      
      // Update cache
      userProfileCache.current = {
        data: data,
        timestamp: now
      }
      
      setUserRole(role)
      return role
    } catch (error) {
      const err = error as Error
      setError('profile', err)
      console.warn('Profile fetch failed, using default role:', err)
      return 'agent'
    } finally {
      setLoadingState('profile', false)
    }
  }, [user, setLoadingState, clearError, setError])
  
  // Load tasks with improved error handling
  const loadTasks = useCallback(async (providedUserRole?: string): Promise<TaskWithRelations[]> => {
    if (!user) return []
    
    setLoadingState('tasks', true)
    clearError('tasks')
    
    try {
      // Get user role
      const currentUserRole = providedUserRole || await getUserRoleWithCache()
      
      // Build query
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:profiles!tasks_assigned_to_profiles_fkey(
            id,
            full_name,
            email
          ),
          client:clients(
            id,
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10)
      
      // Apply role-based filtering
      if (currentUserRole === 'agent') {
        query = query.eq('assigned_to', user.id)
      } else if (currentUserRole === 'manager') {
        query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
      }
      
      // Execute query with timeout and retry
      const { data, error } = await SupabaseQueryHelper.fetchTasks(supabase, query)
      
      if (error) {
        throw new Error(`Task query failed: ${error.message || error}`)
      }
      
      const taskData = data || []
      setTasks(taskData)
      return taskData
    } catch (error) {
      const err = error as Error
      setError('tasks', err)
      return []
    } finally {
      setLoadingState('tasks', false)
    }
  }, [user, getUserRoleWithCache, setLoadingState, clearError, setError])
  
  // Load clients with improved error handling
  const loadClients = useCallback(async (providedUserRole?: string): Promise<any[]> => {
    if (!user) return []
    
    setLoadingState('clients', true)
    clearError('clients')
    
    try {
      // Get user role if not provided
      if (!providedUserRole) {
        await getUserRoleWithCache()
      }
      
      // Build query
      const query = supabase
        .from('clients')
        .select('id, full_name, email, phone')
        .order('full_name', { ascending: true })
        .limit(5)
      
      // Execute query with timeout and retry
      const { data, error } = await SupabaseQueryHelper.fetchClients(supabase, query)
      
      if (error) {
        throw new Error(`Client query failed: ${error.message || error}`)
      }
      
      const clientData = data || []
      setClients(clientData)
      return clientData
    } catch (error) {
      const err = error as Error
      setError('clients', err)
      return []
    } finally {
      setLoadingState('clients', false)
    }
  }, [user, getUserRoleWithCache, setLoadingState, clearError, setError])
  
  // Load tomorrow's tasks
  const loadTomorrowTasks = useCallback(async (): Promise<any[]> => {
    if (!user) return []
    
    setLoadingState('tomorrowTasks', true)
    clearError('tomorrowTasks')
    
    try {
      const currentUserRole = await getUserRoleWithCache()
      
      // Calculate tomorrow's date range
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      
      const dayAfterTomorrow = new Date(tomorrow)
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)
      
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:profiles!tasks_assigned_to_profiles_fkey(
            id,
            full_name,
            email
          ),
          client:clients(
            id,
            full_name
          )
        `)
        .gte('due_date', tomorrow.toISOString())
        .lt('due_date', dayAfterTomorrow.toISOString())
        .order('due_date', { ascending: true })
        .limit(5)
      
      // Apply role-based filtering
      if (currentUserRole === 'agent') {
        query = query.eq('assigned_to', user.id)
      } else if (currentUserRole === 'manager') {
        query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
      }
      
      const { data, error } = await QueryManager.executeSupabaseQuery(
        query,
        {
          timeout: API_CONFIG.TIMEOUTS.TASK_QUERY,
          operation: 'Tomorrow tasks query',
          retries: 1
        }
      )
      
      if (error) {
        throw new Error(`Tomorrow tasks query failed: ${error.message || error}`)
      }
      
      const tomorrowTasksData = data || []
      setTomorrowTasks(tomorrowTasksData)
      return tomorrowTasksData
    } catch (error) {
      const err = error as Error
      setError('tomorrowTasks', err)
      return []
    } finally {
      setLoadingState('tomorrowTasks', false)
    }
  }, [user, getUserRoleWithCache, setLoadingState, clearError, setError])
  
  // Calculate task progress
  const calculateTaskProgress = useCallback(async (): Promise<void> => {
    if (!user) return
    
    setLoadingState('taskProgress', true)
    clearError('taskProgress')
    
    try {
      const currentUserRole = await getUserRoleWithCache()
      
      let query = supabase
        .from('tasks')
        .select('status')
      
      // Apply role-based filtering
      if (currentUserRole === 'agent') {
        query = query.eq('assigned_to', user.id)
      } else if (currentUserRole === 'manager') {
        query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
      }
      
      const { data, error } = await QueryManager.executeSupabaseQuery(
        query,
        {
          timeout: API_CONFIG.TIMEOUTS.TASK_QUERY,
          operation: 'Task progress query',
          retries: 1
        }
      )
      
      if (error) {
        throw new Error(`Task progress query failed: ${error.message || error}`)
      }
      
      const tasks = data || []
      const completed = tasks.filter(task => task.status === 'completed').length
      const inProgress = tasks.filter(task => task.status === 'in_progress').length
      const pending = tasks.filter(task => task.status === 'pending').length
      const total = tasks.length
      const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0
      
      setTaskProgress({
        completed,
        inProgress,
        pending,
        total,
        completionPercentage
      })
    } catch (error) {
      const err = error as Error
      setError('taskProgress', err)
    } finally {
      setLoadingState('taskProgress', false)
    }
  }, [user, getUserRoleWithCache, setLoadingState, clearError, setError])
  
  // Load analytics data
  const loadAnalyticsData = useCallback(async (currentUserRole: string) => {
    if (!user) return
    
    setLoadingState('analytics', true)
    clearError('analytics')
    
    try {
      const analyticsPromises = [
        AnalyticsService.getUserMetrics(user.id),
        AnalyticsService.getDashboardMetrics(user.id),
        AnalyticsService.getClientInsights(user.id),
        AnalyticsService.getTaskInsights(user.id),
        DataSynchronizationService.getSyncStatus(),
        AnalyticsService.getTaskCounts(user.id, currentUserRole),
        AnalyticsService.getTaskCompletionRateOverTime(user.id, currentUserRole, timePeriod)
      ]
      
      const results = await Promise.allSettled(analyticsPromises)
      const [metrics, dashboardMetrics, clientInsights, taskInsights, syncStatus, taskCounts, taskCompletionRate] = results
      
      setDashboardData({
        metrics: metrics.status === 'fulfilled' ? metrics.value : null,
        dashboardMetrics: dashboardMetrics.status === 'fulfilled' ? dashboardMetrics.value : null,
        clientInsights: clientInsights.status === 'fulfilled' ? clientInsights.value : null,
        taskInsights: taskInsights.status === 'fulfilled' ? taskInsights.value : null,
        syncStatus: syncStatus.status === 'fulfilled' ? syncStatus.value : null,
        taskCounts: taskCounts.status === 'fulfilled' ? taskCounts.value : { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, pendingTasks: 0 },
        taskCompletionRate: taskCompletionRate.status === 'fulfilled' ? taskCompletionRate.value : { labels: [], completionRates: [] }
      })
    } catch (error) {
      const err = error as Error
      setError('analytics', err)
    } finally {
      setLoadingState('analytics', false)
    }
  }, [user, timePeriod, setLoadingState, clearError, setError])
  
  // Main refresh function
  const refresh = useCallback(async () => {
    if (!user) return
    
    setRefreshing(true)
    clearErrors()
    
    try {
      // Get user role first
      const currentUserRole = await getUserRoleWithCache()
      
      // Load critical data first (parallel)
      await Promise.allSettled([
        loadTasks(currentUserRole),
        loadClients(currentUserRole),
        calculateTaskProgress()
      ])
      
      // Load non-critical data
      await Promise.allSettled([
        loadTomorrowTasks(),
        loadAnalyticsData(currentUserRole)
      ])
    } catch (error) {
      console.error('Dashboard refresh failed:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user, getUserRoleWithCache, loadTasks, loadClients, calculateTaskProgress, loadTomorrowTasks, loadAnalyticsData, clearErrors])
  
  // Initial load
  useEffect(() => {
    if (user) {
      refresh()
    }
  }, [user, refresh])
  
  return {
    // Data
    dashboardData,
    tasks,
    clients,
    tomorrowTasks,
    userRole,
    taskProgress,
    
    // Loading states
    loading,
    refreshing,
    loadingStates,
    
    // Error states
    errors,
    
    // Actions
    refresh,
    loadTasks,
    loadClients,
    loadTomorrowTasks,
    calculateTaskProgress,
    clearErrors
  }
}