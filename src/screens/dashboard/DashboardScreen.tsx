import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
  TouchableOpacity,
} from 'react-native'
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  ProgressBar,
  Surface,
  Text,
  Divider,
  Avatar,
  Badge,
  ActivityIndicator,
} from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { supabase } from '../../services/supabase'
import { TaskWithRelations } from '../../types/database'
import { QueryManager } from '../../utils/queryManager'
import { ErrorHandler } from '../../utils/errorHandler'
import { taskStatsService, TaskStats } from '../../services/taskStatsService'

// Import dashboard components
import ProjectStats from './components/ProjectStats'
import ProjectAnalytics from './components/ProjectAnalytics'
import ProjectProgress from './components/ProjectProgress'
import Reminders from './components/Reminders'
import ProjectList from './components/ProjectList'
import TeamCollaboration from './components/TeamCollaboration'
import TimeTracker from './components/TimeTracker'

type TimePeriod = '30d' | '90d' | '6m' | '1y'

const TIME_PERIOD_OPTIONS = [
  { value: '30d' as TimePeriod, label: '30 Days' },
  { value: '90d' as TimePeriod, label: '90 Days' },
  { value: '6m' as TimePeriod, label: '6 Months' },
  { value: '1y' as TimePeriod, label: '1 Year' }
]

const { width: screenWidth } = Dimensions.get('window')

// Use centralized timeout constants from QueryManager
const queryManager = new QueryManager()

export default function DashboardScreen() {
  const { user } = useAuth()
  const navigation = useNavigation()
  const { theme } = useTheme()
  const styles = createStyles(theme)
  
  const [dashboardData, setDashboardData] = useState<any>(null)
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
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('week')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d')
  const [taskTimePeriod, setTaskTimePeriod] = useState<'month' | 'year'>('month')
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')
  const [taskAssignmentFilter, setTaskAssignmentFilter] = useState<'all' | 'todo' | 'client' | 'agent'>('all')

  const loadTasks = useCallback(async () => {
    if (!user) return
    
    try {
      const query = supabase
        .from('tasks')
        .select(`
          *,
          assigned_to_profile:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url),
          created_by_profile:profiles!tasks_created_by_fkey(id, full_name, avatar_url),
          client:clients(id, full_name, email)
        `)
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50)
      
      const { data, error } = await queryManager.executeSupabaseQuery(query, 'tasks')
      
      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      ErrorHandler.logError(error, { context: 'loadTasks', userId: user.id })
      const userMessage = ErrorHandler.getUserFriendlyMessage(error)
      Alert.alert('Error', userMessage)
    }
  }, [user])

  const loadClients = useCallback(async () => {
    if (!user) return
    
    try {
      const query = supabase
        .from('clients')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      const { data, error } = await queryManager.executeSupabaseQuery(query, 'clients')
      
      if (error) throw error
      setClients(data || [])
    } catch (error) {
      ErrorHandler.logError(error, { context: 'loadClients', userId: user.id })
      const userMessage = ErrorHandler.getUserFriendlyMessage(error)
      Alert.alert('Error', userMessage)
    }
  }, [user])

  const loadTomorrowTasks = useCallback(async () => {
    if (!user) return
    
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())
      const tomorrowEnd = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1)
      
      const query = supabase
        .from('tasks')
        .select(`
          *,
          assigned_to_profile:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url),
          client:clients(id, full_name)
        `)
        .eq('assigned_to', user.id)
        .gte('due_date', tomorrowStart.toISOString())
        .lt('due_date', tomorrowEnd.toISOString())
        .order('due_date', { ascending: true })
      
      const { data, error } = await queryManager.executeSupabaseQuery(query, 'tomorrowTasks')
      
      if (error) throw error
      setTomorrowTasks(data || [])
    } catch (error) {
      ErrorHandler.logError(error, { context: 'loadTomorrowTasks', userId: user.id })
      // Silent error for tomorrow tasks - not critical
    }
  }, [user])

  const calculateTaskProgress = useCallback(async () => {
    if (!user) return
    
    try {
      const query = supabase
        .from('tasks')
        .select('status')
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
      
      const { data, error } = await queryManager.executeSupabaseQuery(query, 'taskProgress')
      
      if (error) throw error
      
      const completed = data?.filter(t => t.status === 'completed').length || 0
      const inProgress = data?.filter(t => t.status === 'in_progress').length || 0
      const pending = data?.filter(t => t.status === 'pending').length || 0
      const total = data?.length || 0
      const completionPercentage = total > 0 ? (completed / total) * 100 : 0
      
      setTaskProgress({
        completed,
        inProgress,
        pending,
        total,
        completionPercentage
      })
    } catch (error) {
      ErrorHandler.logError(error, { context: 'calculateTaskProgress', userId: user.id })
      // Silent error for progress calculation
    }
  }, [user])

  const loadTaskStats = useCallback(async () => {
    if (!user) return
    
    try {
      setStatsLoading(true)
      const stats = await taskStatsService.fetchTaskStatsWithRetry()
      setTaskStats(stats)
    } catch (error) {
      ErrorHandler.logError(error as Error, { 
        operation: 'loadTaskStats', 
        userId: user.id 
      })
    } finally {
      setStatsLoading(false)
    }
  }, [user])

  const loadDashboardData = useCallback(async () => {
    if (!user) return
    
    try {
      setLoading(true)
      await Promise.all([
        loadTasks(),
        loadClients(),
        loadTomorrowTasks(),
        calculateTaskProgress(),
        loadTaskStats()
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      Alert.alert('Error', 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [loadTasks, loadClients, loadTomorrowTasks, calculateTaskProgress, loadTaskStats])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await loadDashboardData()
    setRefreshing(false)
  }, [loadDashboardData])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const filteredTasks = React.useMemo(() => {
    let filtered = tasks
    
    if (taskStatusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === taskStatusFilter)
    }
    
    if (taskAssignmentFilter !== 'all') {
      if (taskAssignmentFilter === 'todo') {
        filtered = filtered.filter(task => task.assigned_to === user?.id)
      }
    }
    
    return filtered
  }, [tasks, taskStatusFilter, taskAssignmentFilter, user?.id])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          colors={[theme.colors.primary]}
        />
      }
    >
      <View style={styles.headerContainer}>
        <Text style={styles.dashboardTitle}>Dashboard</Text>
        <Text style={styles.dashboardSubtitle}>Plan, prioritize, and accomplish your tasks with ease.</Text>
        
        <View style={styles.actionButtons}>
          <Button 
            mode="contained" 
            icon="plus"
            style={styles.addProjectButton}
            labelStyle={styles.buttonLabel}
            onPress={() => console.log('Add Project')}
          >
            Add Project
          </Button>
          
          <Button 
            mode="outlined" 
            style={styles.importButton}
            labelStyle={styles.importButtonLabel}
            onPress={() => console.log('Import Data')}
          >
            Import Data
          </Button>
        </View>
      </View>
      
      {/* First Row: Project Statistics */}
      <ProjectStats loading={loading} />
      
      {/* Second Row: Two Columns Layout */}
      <View style={styles.twoColumnContainer}>
        {/* Left Column */}
        <View style={styles.leftColumn}>
          {/* Left Column - First Row */}
          <View style={styles.leftColumnTopRow}>
            {/* Project Analytics */}
            <ProjectAnalytics loading={loading} />
            
            {/* Reminders */}
            <Reminders loading={loading} />
          </View>
          
          {/* Left Column - Second Row */}
          <View style={styles.leftColumnBottomRow}>
            {/* Team Collaboration */}
            <TeamCollaboration loading={loading} />
            
            {/* Project Progress */}
            <ProjectProgress loading={loading} />
          </View>
        </View>
        
        {/* Right Column */}
        <View style={styles.rightColumn}>
          {/* Project List */}
          <ProjectList loading={loading} />
          
          {/* Time Tracker */}
          <TimeTracker loading={loading} />
        </View>
      </View>
    </ScrollView>
  )
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return '#4CAF50'
    case 'in_progress':
      return '#FF9800'
    case 'pending':
      return '#F44336'
    default:
      return '#9E9E9E'
  }
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.onSurface,
  },
  headerContainer: {
    backgroundColor: '#F5F7F9',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  dashboardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  dashboardSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  addProjectButton: {
    backgroundColor: '#1A8D1A', // Darker green color to match the reference
    borderRadius: 20, // More rounded corners
    flex: 1,
    marginRight: 8,
  },
  importButton: {
    borderColor: '#CCCCCC',
    borderRadius: 20, // More rounded corners to match Add Project button
    flex: 1,
    marginLeft: 8,
    backgroundColor: 'white',
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  importButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  twoColumnContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 16,
    flex: 1,
  },
  leftColumn: {
    flex: 2, // Left column takes 2/3 of the space
    marginRight: 12,
  },
  rightColumn: {
    flex: 1, // Right column takes 1/3 of the space
    marginLeft: 12,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  leftColumnTopRow: {
    flexDirection: 'row',
    marginBottom: 16,
    height: 'auto',
    justifyContent: 'space-between',
  },
  leftColumnBottomRow: {
    flexDirection: 'row',
    height: 'auto',
    justifyContent: 'space-between',
  },
  // Keep these styles for backward compatibility
  card: {
    margin: 16,
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  progressSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  taskItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  taskStatus: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  taskDueDate: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  taskTime: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  clientItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  clientEmail: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  button: {
    marginTop: 16,
  },
})