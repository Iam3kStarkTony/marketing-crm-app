import { supabase } from './supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface AnalyticsEvent {
  event_name: string
  properties: Record<string, any>
  timestamp: string
  user_id?: string
  session_id: string
}

interface UserMetrics {
  totalClients: number
  totalTasks: number
  totalMessages: number
  completedTasks: number
  overdueTasksCount: number
  averageTaskCompletionTime: number
  clientEngagementRate: number
  messageResponseTime: number
}

interface DashboardMetrics {
  today: {
    newClients: number
    newTasks: number
    completedTasks: number
    newMessages: number
  }
  thisWeek: {
    newClients: number
    newTasks: number
    completedTasks: number
    newMessages: number
  }
  thisMonth: {
    newClients: number
    newTasks: number
    completedTasks: number
    newMessages: number
  }
  trends: {
    clientGrowth: number // percentage
    taskCompletion: number // percentage
    messageVolume: number // percentage
  }
}

interface ClientInsights {
  mostActiveClients: Array<{
    client_id: string
    name: string
    messageCount: number
    taskCount: number
    lastContact: string
  }>
  clientsByStatus: {
    active: number
    inactive: number
    prospect: number
  }
  averageClientValue: number
  clientRetentionRate: number
}

interface TaskInsights {
  tasksByPriority: {
    high: number
    medium: number
    low: number
  }
  tasksByStatus: {
    pending: number
    in_progress: number
    completed: number
    cancelled: number
  }
  averageCompletionTime: number
  overdueRate: number
  productivityScore: number
}

export class AnalyticsService {
  private static sessionId: string | null = null
  private static readonly STORAGE_KEY = 'analytics_session'
  private static readonly EVENTS_QUEUE_KEY = 'analytics_events_queue'

  /**
   * Initialize analytics session
   */
  static async initializeSession(): Promise<string> {
    try {
      let sessionId = await AsyncStorage.getItem(this.STORAGE_KEY)
      
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        await AsyncStorage.setItem(this.STORAGE_KEY, sessionId)
      }
      
      this.sessionId = sessionId
      return sessionId
    } catch (error) {
      console.error('Error initializing analytics session:', error)
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      return this.sessionId
    }
  }

  /**
   * Track an analytics event
   */
  static async trackEvent(
    eventName: string,
    properties: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    try {
      if (!this.sessionId) {
        await this.initializeSession()
      }

      // Check if user profile exists before inserting analytics event
      if (userId) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .single()

          if (profileError || !profile) {
            console.warn('Analytics: User profile not found, queuing event for later:', {
              userId: userId,
              error: profileError?.message
            })
            const event: AnalyticsEvent = {
              event_name: eventName,
              properties: {
                ...properties,
                platform: 'react-native',
                app_version: '1.0.0'
              },
              timestamp: new Date().toISOString(),
              user_id: userId,
              session_id: this.sessionId!
            }
            await this.queueEventForLater(event)
            return
          }
        } catch (error) {
          console.warn('Analytics: Error checking user profile, queuing event:', error)
          const event: AnalyticsEvent = {
            event_name: eventName,
            properties: {
              ...properties,
              platform: 'react-native',
              app_version: '1.0.0'
            },
            timestamp: new Date().toISOString(),
            user_id: userId,
            session_id: this.sessionId!
          }
          await this.queueEventForLater(event)
          return
        }
      }

      const event: AnalyticsEvent = {
        event_name: eventName,
        properties: {
          ...properties,
          platform: 'react-native',
          app_version: '1.0.0'
        },
        timestamp: new Date().toISOString(),
        user_id: userId,
        session_id: this.sessionId!
      }

      // Store event in Supabase
      const { error } = await supabase
        .from('analytics_events')
        .insert([event])

      if (error) {
        // Log detailed error information for debugging
        console.error('Analytics event insert failed:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          eventName: eventName,
          userId: userId
        })
        
        // If online storage fails, queue for later
        await this.queueEventForLater(event)
        console.warn('Event queued for later sync due to error:', error.message)
      }
    } catch (error) {
      console.error('Error tracking event:', error)
      // Queue event for later sync
      const event: AnalyticsEvent = {
        event_name: eventName,
        properties,
        timestamp: new Date().toISOString(),
        user_id: userId,
        session_id: this.sessionId || 'unknown'
      }
      await this.queueEventForLater(event)
    }
  }

  /**
   * Queue event for later synchronization
   */
  private static async queueEventForLater(event: AnalyticsEvent): Promise<void> {
    try {
      const queuedEvents = await AsyncStorage.getItem(this.EVENTS_QUEUE_KEY)
      const events = queuedEvents ? JSON.parse(queuedEvents) : []
      events.push(event)
      await AsyncStorage.setItem(this.EVENTS_QUEUE_KEY, JSON.stringify(events))
    } catch (error) {
      console.error('Error queueing event:', error)
    }
  }

  /**
   * Sync queued events with timeout
   */
  static async syncQueuedEvents(): Promise<void> {
    try {
      const queuedEvents = await AsyncStorage.getItem(this.EVENTS_QUEUE_KEY)
      if (!queuedEvents) return

      const events: AnalyticsEvent[] = JSON.parse(queuedEvents)
      if (events.length === 0) return

      // Check if any events have user_id and validate profiles exist
      const eventsWithUserId = events.filter(event => event.user_id)
      if (eventsWithUserId.length > 0) {
        const uniqueUserIds = [...new Set(eventsWithUserId.map(event => event.user_id))]
        
        for (const userId of uniqueUserIds) {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', userId)
              .single()

            if (profileError || !profile) {
              console.warn('Analytics sync: User profile not found, skipping events for user:', {
                userId: userId,
                error: profileError?.message
              })
              // Remove events for this user from the sync batch
              const filteredEvents = events.filter(event => event.user_id !== userId)
              if (filteredEvents.length !== events.length) {
                await AsyncStorage.setItem(this.EVENTS_QUEUE_KEY, JSON.stringify(filteredEvents))
                console.log(`Removed ${events.length - filteredEvents.length} events for non-existent user ${userId}`)
              }
              return
            }
          } catch (error) {
            console.warn('Analytics sync: Error checking user profile, skipping sync:', {
              error: error instanceof Error ? error.message : 'Unknown error',
              userId: userId
            })
            return
          }
        }
      }

      const SYNC_TIMEOUT = 8000 // 8 seconds timeout
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Analytics sync timeout')), SYNC_TIMEOUT)
      })
      
      // Upload events to Supabase with timeout
      const uploadPromise = supabase
        .from('analytics_events')
        .insert(events)
      
      const { error } = await Promise.race([uploadPromise, timeoutPromise]) as any

      if (!error) {
        await AsyncStorage.removeItem(this.EVENTS_QUEUE_KEY)
        console.log(`Successfully synced ${events.length} queued analytics events`)
      } else {
        // Log detailed error information for debugging
        console.error('Analytics events sync failed:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          eventCount: events.length,
          firstEventName: events[0]?.event_name,
          lastEventName: events[events.length - 1]?.event_name
        })
        
        // Don't remove events from queue if sync failed
        console.warn(`Failed to sync ${events.length} queued events, will retry later`)
      }
    } catch (error) {
      console.error('Error syncing queued events:', error)
      // Don't throw - let analytics sync fail gracefully
    }
  }

  /**
   * Track screen view
   */
  static async trackScreenView(screenName: string, userId?: string): Promise<void> {
    await this.trackEvent('screen_view', {
      screen_name: screenName
    }, userId)
  }

  /**
   * Track user action
   */
  static async trackUserAction(
    action: string,
    category: string,
    properties: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    await this.trackEvent('user_action', {
      action,
      category,
      ...properties
    }, userId)
  }

  /**
   * Get task counts based on user role
   */
  static async getTaskCounts(userId: string, userRole: string): Promise<{
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    pendingTasks: number
  }> {
    try {
      let tasksQuery = supabase.from('tasks').select('status')
      
      // If user is not admin, only show tasks assigned to them or created by them
      if (userRole !== 'admin') {
        tasksQuery = tasksQuery.or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
      }
      
      const { data: tasks, error } = await tasksQuery
      
      if (error) {
        console.error('Error fetching task counts:', error)
        throw error
      }
      
      const taskCounts = {
        totalTasks: tasks?.length || 0,
        completedTasks: tasks?.filter(task => task.status === 'completed').length || 0,
        inProgressTasks: tasks?.filter(task => task.status === 'in_progress').length || 0,
        pendingTasks: tasks?.filter(task => task.status === 'pending').length || 0
      }
      
      return taskCounts
    } catch (error) {
      console.error('Error getting task counts:', error)
      throw error
    }
  }

  /**
   * Get task completion rate over time with extended periods
   */
  static async getTaskCompletionRateOverTime(
    userId: string, 
    userRole: string, 
    period: '30d' | '90d' | '6m' | '1y' = '30d'
  ): Promise<{
    labels: string[]
    completionRates: number[]
  }> {
    try {
      // Calculate date range based on period
      const now = new Date()
      let startDate: Date
      let groupBy: 'day' | 'week' | 'month'
      
      switch (period) {
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          groupBy = 'day'
          break
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          groupBy = 'week'
          break
        case '6m':
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
          groupBy = 'week'
          break
        case '1y':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
          groupBy = 'month'
          break
      }

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('created_at, updated_at, status, assigned_to, created_by')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error

      // Filter tasks based on user role
      const filteredTasks = userRole === 'admin' ? tasks : tasks?.filter(task => 
        task.assigned_to === userId || task.created_by === userId
      )

      // Generate time periods based on groupBy
      const periods = this.generateTimePeriods(startDate, now, groupBy)
      
      const completionRates = periods.map(period => {
        // Get all tasks that were completed during this period
        const completedInPeriod = filteredTasks?.filter(task => {
          if (task.status !== 'completed') return false
          const completedDate = new Date(task.updated_at)
          return completedDate >= period.start && completedDate <= period.end
        }) || []
        
        // Get all tasks that existed during this period (created before or during)
        const existingTasks = filteredTasks?.filter(task => {
          const taskDate = new Date(task.created_at)
          return taskDate <= period.end
        }) || []
        
        const rate = existingTasks.length > 0 ? Math.round((completedInPeriod.length / existingTasks.length) * 100) : 0
        return rate
      })

      const labels = periods.map(period => period.label)
      
      return { labels, completionRates }
    } catch (error) {
      console.error('Error getting task completion rate over time:', error)
      // Return fallback data based on period
      const fallbackData = this.getFallbackData(period)
      return fallbackData
    }
  }

  /**
   * Helper function to generate time periods
   */
  private static generateTimePeriods(startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month') {
    const periods = []
    const current = new Date(startDate)
    
    while (current <= endDate) {
      const periodStart = new Date(current)
      let periodEnd: Date
      let label: string
      
      switch (groupBy) {
        case 'day':
          periodEnd = new Date(current)
          periodEnd.setHours(23, 59, 59, 999)
          label = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          current.setDate(current.getDate() + 1)
          break
        case 'week':
          periodEnd = new Date(current)
          periodEnd.setDate(current.getDate() + 6)
          periodEnd.setHours(23, 59, 59, 999)
          label = `Week ${Math.ceil((current.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1}`
          current.setDate(current.getDate() + 7)
          break
        case 'month':
          periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0)
          periodEnd.setHours(23, 59, 59, 999)
          label = current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          current.setMonth(current.getMonth() + 1)
          break
      }
      
      periods.push({
        start: periodStart,
        end: periodEnd > endDate ? endDate : periodEnd,
        label
      })
    }
    
    return periods
  }

  /**
   * Helper function for fallback data
   */
  private static getFallbackData(period: '30d' | '90d' | '6m' | '1y') {
    switch (period) {
      case '30d':
        return {
          labels: Array.from({ length: 30 }, (_, i) => {
            const date = new Date()
            date.setDate(date.getDate() - (29 - i))
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          }),
          completionRates: Array(30).fill(0)
        }
      case '90d':
        return {
          labels: Array.from({ length: 13 }, (_, i) => `Week ${i + 1}`),
          completionRates: Array(13).fill(0)
        }
      case '6m':
        return {
          labels: Array.from({ length: 26 }, (_, i) => `Week ${i + 1}`),
          completionRates: Array(26).fill(0)
        }
      case '1y':
        return {
          labels: Array.from({ length: 12 }, (_, i) => {
            const date = new Date()
            date.setMonth(date.getMonth() - (11 - i))
            return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          }),
          completionRates: Array(12).fill(0)
        }
    }
  }

  /**
   * Get user metrics
   */
  static async getUserMetrics(userId: string): Promise<UserMetrics> {
    try {
      // Get user profile to determine role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      const userRole = profile?.role || 'agent'
      
      // Build clients query based on user role
      let clientsQuery = supabase.from('clients').select('*')
      if (userRole !== 'admin') {
        clientsQuery = clientsQuery.eq('created_by', userId)
      }
      
      const [clientsResult, tasksResult, messagesResult] = await Promise.all([
        clientsQuery,
        supabase
          .from('tasks')
          .select('*')
          .or(`assigned_to.eq.${userId},created_by.eq.${userId}`),
        supabase
          .from('messages')
          .select('*')
          .eq('sender_id', userId)
      ])

      const clients = clientsResult.data || []
      const tasks = tasksResult.data || []
      const messages = messagesResult.data || []

      const completedTasks = tasks.filter(task => task.status === 'completed')
      const overdueTasks = tasks.filter(task => 
        task.status !== 'completed' && 
        task.due_date && 
        new Date(task.due_date) < new Date()
      )

      // Calculate average task completion time
      const completionTimes = completedTasks
        .filter(task => task.completed_at && task.created_at)
        .map(task => {
          const created = new Date(task.created_at).getTime()
          const completed = new Date(task.completed_at!).getTime()
          return completed - created
        })

      const averageTaskCompletionTime = completionTimes.length > 0
        ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length / (1000 * 60 * 60 * 24) // days
        : 0

      // Calculate client engagement rate (clients with recent activity)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const activeClients = clients.filter(client => {
        const lastMessage = messages
          .filter(msg => msg.client_id === client.id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        return lastMessage && new Date(lastMessage.created_at) > thirtyDaysAgo
      })

      const clientEngagementRate = clients.length > 0 ? (activeClients.length / clients.length) * 100 : 0

      // Calculate average message response time (simplified)
      const messageResponseTime = 2.5 // hours (placeholder - would need more complex calculation)

      return {
        totalClients: clients.length,
        totalTasks: tasks.length,
        totalMessages: messages.length,
        completedTasks: completedTasks.length,
        overdueTasksCount: overdueTasks.length,
        averageTaskCompletionTime,
        clientEngagementRate,
        messageResponseTime
      }
    } catch (error) {
      console.error('Error getting user metrics:', error)
      throw error
    }
  }

  /**
   * Get dashboard metrics
   */
  static async getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000))
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      // Get data for different time periods
      const [todayData, weekData, monthData, previousMonthData] = await Promise.all([
        this.getMetricsForPeriod(userId, today, now),
        this.getMetricsForPeriod(userId, weekStart, now),
        this.getMetricsForPeriod(userId, monthStart, now),
        this.getMetricsForPeriod(userId, new Date(now.getFullYear(), now.getMonth() - 1, 1), monthStart)
      ])

      // Calculate trends
      const clientGrowth = previousMonthData.newClients > 0
        ? ((monthData.newClients - previousMonthData.newClients) / previousMonthData.newClients) * 100
        : monthData.newClients > 0 ? 100 : 0

      const taskCompletion = monthData.newTasks > 0
        ? (monthData.completedTasks / monthData.newTasks) * 100
        : 0

      const messageVolume = previousMonthData.newMessages > 0
        ? ((monthData.newMessages - previousMonthData.newMessages) / previousMonthData.newMessages) * 100
        : monthData.newMessages > 0 ? 100 : 0

      return {
        today: todayData,
        thisWeek: weekData,
        thisMonth: monthData,
        trends: {
          clientGrowth,
          taskCompletion,
          messageVolume
        }
      }
    } catch (error) {
      console.error('Error getting dashboard metrics:', error)
      throw error
    }
  }

  /**
   * Get metrics for a specific time period
   */
  private static async getMetricsForPeriod(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    newClients: number
    newTasks: number
    completedTasks: number
    newMessages: number
  }> {
    // Get user profile to determine role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    
    const userRole = profile?.role || 'agent'
    
    // Build clients query based on user role
    let clientsQuery = supabase
      .from('clients')
      .select('id')
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString())
    
    if (userRole !== 'admin') {
      clientsQuery = clientsQuery.eq('created_by', userId)
    }
    
    const [clientsResult, tasksResult, completedTasksResult, messagesResult] = await Promise.all([
      clientsQuery,
      supabase
        .from('tasks')
        .select('id')
        .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString()),
      supabase
        .from('tasks')
        .select('id')
        .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
        .eq('status', 'completed')
        .gte('completed_at', startDate.toISOString())
        .lt('completed_at', endDate.toISOString()),
      supabase
        .from('messages')
        .select('id')
        .eq('sender_id', userId)
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
    ])

    return {
      newClients: clientsResult.data?.length || 0,
      newTasks: tasksResult.data?.length || 0,
      completedTasks: completedTasksResult.data?.length || 0,
      newMessages: messagesResult.data?.length || 0
    }
  }

  /**
   * Get client insights
   */
  static async getClientInsights(userId: string): Promise<ClientInsights> {
    try {
      // Get user profile to determine role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      const userRole = profile?.role || 'agent'
      
      // Build clients query based on user role
      let clientsQuery = supabase
        .from('clients')
        .select(`
          *,
          tasks:tasks(count),
          messages:messages(count)
        `)
      
      if (userRole !== 'admin') {
        clientsQuery = clientsQuery.eq('created_by', userId)
      }
      
      const { data: clients, error: clientsError } = await clientsQuery

      if (clientsError) throw clientsError

      // Get most active clients
      const mostActiveClients = (clients || [])
        .map(client => ({
          client_id: client.id,
          name: client.full_name,
          messageCount: client.messages?.[0]?.count || 0,
          taskCount: client.tasks?.[0]?.count || 0,
          lastContact: client.updated_at
        }))
        .sort((a, b) => (b.messageCount + b.taskCount) - (a.messageCount + a.taskCount))
        .slice(0, 10)

      // Calculate client status distribution
      const clientsByStatus = {
        active: 0,
        inactive: 0,
        prospect: 0
      }

      // This would need to be based on your client status logic
      // For now, using a simple heuristic
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      clients?.forEach(client => {
        const lastActivity = new Date(client.updated_at)
        if (lastActivity > thirtyDaysAgo) {
          clientsByStatus.active++
        } else {
          clientsByStatus.inactive++
        }
      })

      return {
        mostActiveClients,
        clientsByStatus,
        averageClientValue: 0, // Would need revenue data
        clientRetentionRate: 85 // Placeholder
      }
    } catch (error) {
      console.error('Error getting client insights:', error)
      throw error
    }
  }

  /**
   * Get task insights
   */
  static async getTaskInsights(userId: string): Promise<TaskInsights> {
    try {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)

      if (error) throw error

      const tasksByPriority = {
        high: tasks?.filter(task => task.priority === 'high').length || 0,
        medium: tasks?.filter(task => task.priority === 'medium').length || 0,
        low: tasks?.filter(task => task.priority === 'low').length || 0
      }

      const tasksByStatus = {
        pending: tasks?.filter(task => task.status === 'pending').length || 0,
        in_progress: tasks?.filter(task => task.status === 'in_progress').length || 0,
        completed: tasks?.filter(task => task.status === 'completed').length || 0,
        cancelled: tasks?.filter(task => task.status === 'cancelled').length || 0
      }

      // Calculate average completion time
      const completedTasks = tasks?.filter(task => 
        task.status === 'completed' && task.completed_at && task.created_at
      ) || []

      const completionTimes = completedTasks.map(task => {
        const created = new Date(task.created_at).getTime()
        const completed = new Date(task.completed_at!).getTime()
        return completed - created
      })

      const averageCompletionTime = completionTimes.length > 0
        ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length / (1000 * 60 * 60 * 24)
        : 0

      // Calculate overdue rate
      const overdueTasks = tasks?.filter(task => 
        task.status !== 'completed' && 
        task.due_date && 
        new Date(task.due_date) < new Date()
      ).length || 0

      const overdueRate = tasks && tasks.length > 0 ? (overdueTasks / tasks.length) * 100 : 0

      // Calculate productivity score (completed tasks / total tasks * 100)
      const productivityScore = tasks && tasks.length > 0 
        ? (tasksByStatus.completed / tasks.length) * 100 
        : 0

      return {
        tasksByPriority,
        tasksByStatus,
        averageCompletionTime,
        overdueRate,
        productivityScore
      }
    } catch (error) {
      console.error('Error getting task insights:', error)
      throw error
    }
  }

  /**
   * Set user ID for analytics tracking
   */
  static async setUserId(userId: string): Promise<void> {
    try {
      // Store user ID for analytics tracking
      await AsyncStorage.setItem('analytics_user_id', userId)
      console.log('Analytics: User ID set:', userId)
    } catch (error) {
      console.error('Error setting user ID for analytics:', error)
    }
  }

  /**
   * Clear user ID from analytics
   */
  static async clearUserId(): Promise<void> {
    try {
      // Clear any user-specific analytics data
      await AsyncStorage.removeItem('analytics_user_id')
      console.log('Analytics: User ID cleared')
    } catch (error) {
      console.error('Error clearing user ID from analytics:', error)
    }
  }

  /**
   * Clear analytics session
   */
  static async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY)
      await AsyncStorage.removeItem(this.EVENTS_QUEUE_KEY)
      this.sessionId = null
    } catch (error) {
      console.error('Error clearing analytics session:', error)
    }
  }
}