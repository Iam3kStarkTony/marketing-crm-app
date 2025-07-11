import { supabase } from './supabase'
import { OfflineStorageService } from './offlineStorage'
import { AnalyticsService } from './analytics'
import { Client, Task, Message } from '../types/database'
import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'

interface SyncItem {
  id: string
  table: 'clients' | 'tasks' | 'messages'
  action: 'create' | 'update' | 'delete'
  data: any
  timestamp: string
  userId: string
  localId?: string // For offline-created items
}

interface SyncResult {
  success: boolean
  synced: number
  failed: number
  conflicts: number
  errors: string[]
}

interface ConflictResolution {
  strategy: 'client_wins' | 'server_wins' | 'merge' | 'manual'
  resolvedData?: any
}

export class DataSynchronizationService {
  private static readonly SYNC_QUEUE_KEY = 'sync_queue'
  private static readonly LAST_SYNC_KEY = 'last_sync_timestamp'
  private static readonly CONFLICT_RESOLUTION_KEY = 'conflict_resolutions'
  private static isOnline = true
  private static syncInProgress = false

  /**
   * Initialize the synchronization service
   */
  static async initialize(userId?: string): Promise<void> {
    // Monitor network status
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline
      this.isOnline = state.isConnected ?? false
      
      // If we just came back online, trigger sync
      if (wasOffline && this.isOnline && userId) {
        // Perform sync in background, don't block
        this.performFullSync(userId).catch(error => {
          console.error('Background sync failed:', error)
        })
      }
    })

    // Get initial network status
    const netInfo = await NetInfo.fetch()
    this.isOnline = netInfo.isConnected ?? false

    // Perform initial sync in background if online and userId is provided
    if (this.isOnline && userId) {
      // Don't await - let sync happen in background
      this.performFullSync(userId).catch(error => {
        console.error('Initial background sync failed:', error)
      })
    }
  }

  /**
   * Add item to sync queue
   */
  static async queueForSync(
    table: 'clients' | 'tasks' | 'messages',
    action: 'create' | 'update' | 'delete',
    data: any,
    userId: string,
    localId?: string
  ): Promise<void> {
    try {
      const syncItem: SyncItem = {
        id: data.id || localId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        table,
        action,
        data,
        timestamp: new Date().toISOString(),
        userId,
        localId
      }

      const queueData = await AsyncStorage.getItem(this.SYNC_QUEUE_KEY)
      const queue: SyncItem[] = queueData ? JSON.parse(queueData) : []
      queue.push(syncItem)
      
      await AsyncStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue))
      
      // If online, try to sync immediately
      if (this.isOnline && !this.syncInProgress) {
        await this.processSyncQueue()
      }
    } catch (error) {
      console.error('Error queueing item for sync:', error)
    }
  }

  /**
   * Process the sync queue
   */
  static async processSyncQueue(): Promise<SyncResult> {
    if (this.syncInProgress || !this.isOnline) {
      return { success: false, synced: 0, failed: 0, conflicts: 0, errors: ['Sync already in progress or offline'] }
    }

    this.syncInProgress = true
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: 0,
      errors: []
    }

    try {
      const queueData = await AsyncStorage.getItem(this.SYNC_QUEUE_KEY)
      if (!queueData) {
        this.syncInProgress = false
        return result
      }

      const queue: SyncItem[] = JSON.parse(queueData)
      const processedItems: string[] = []

      for (const item of queue) {
        try {
          const syncSuccess = await this.syncItem(item)
          if (syncSuccess) {
            result.synced++
            processedItems.push(item.id)
          } else {
            result.failed++
          }
        } catch (error) {
          console.error(`Error syncing item ${item.id}:`, error)
          result.failed++
          result.errors.push(`Failed to sync ${item.table} ${item.id}: ${error}`)
        }
      }

      // Remove successfully processed items from queue
      const remainingQueue = queue.filter(item => !processedItems.includes(item.id))
      await AsyncStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(remainingQueue))

      // Update last sync timestamp
      await AsyncStorage.setItem(this.LAST_SYNC_KEY, new Date().toISOString())

      // Track sync analytics
      // Get current user ID from Supabase auth
      const { data: { user } } = await supabase.auth.getUser()
      await AnalyticsService.trackEvent('data_sync_completed', {
        synced: result.synced,
        failed: result.failed,
        conflicts: result.conflicts
      }, user?.id)

    } catch (error) {
      console.error('Error processing sync queue:', error)
      result.success = false
      result.errors.push(`Sync queue processing failed: ${error}`)
    } finally {
      this.syncInProgress = false
    }

    return result
  }

  /**
   * Sync a single item
   */
  private static async syncItem(item: SyncItem): Promise<boolean> {
    try {
      switch (item.action) {
        case 'create':
          return await this.syncCreate(item)
        case 'update':
          return await this.syncUpdate(item)
        case 'delete':
          return await this.syncDelete(item)
        default:
          console.error('Unknown sync action:', item.action)
          return false
      }
    } catch (error) {
      console.error(`Error syncing item ${item.id}:`, error)
      return false
    }
  }

  /**
   * Sync create operation
   */
  private static async syncCreate(item: SyncItem): Promise<boolean> {
    try {
      // For items created offline, we need to handle ID mapping
      const dataToInsert = { ...item.data }
      
      // Remove temporary ID if it exists
      if (item.localId && dataToInsert.id === item.localId) {
        delete dataToInsert.id
      }

      const { data, error } = await supabase
        .from(item.table)
        .insert([dataToInsert])
        .select()
        .single()

      if (error) {
        console.error(`Error creating ${item.table}:`, error)
        return false
      }

      // Update local storage with the real ID
      if (item.localId && data) {
        await this.updateLocalIdMapping(item.table, item.localId, data.id, item.userId)
      }

      return true
    } catch (error) {
      console.error(`Error in syncCreate for ${item.table}:`, error)
      return false
    }
  }

  /**
   * Sync update operation
   */
  private static async syncUpdate(item: SyncItem): Promise<boolean> {
    try {
      // Check for conflicts by comparing timestamps
      const { data: currentData, error: fetchError } = await supabase
        .from(item.table)
        .select('*')
        .eq('id', item.data.id)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // Item doesn't exist on server, treat as create
          return await this.syncCreate(item)
        }
        console.error(`Error fetching current data for ${item.table}:`, fetchError)
        return false
      }

      // Check for conflicts
      const serverTimestamp = new Date(currentData.updated_at || currentData.created_at)
      const localTimestamp = new Date(item.timestamp)
      
      if (serverTimestamp > localTimestamp) {
        // Conflict detected
        const resolution = await this.resolveConflict(item, currentData)
        if (!resolution) {
          return false // Conflict not resolved
        }
        item.data = resolution.resolvedData
      }

      const { error } = await supabase
        .from(item.table)
        .update(item.data)
        .eq('id', item.data.id)

      if (error) {
        console.error(`Error updating ${item.table}:`, error)
        return false
      }

      return true
    } catch (error) {
      console.error(`Error in syncUpdate for ${item.table}:`, error)
      return false
    }
  }

  /**
   * Sync delete operation
   */
  private static async syncDelete(item: SyncItem): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(item.table)
        .delete()
        .eq('id', item.data.id)

      if (error) {
        console.error(`Error deleting ${item.table}:`, error)
        return false
      }

      return true
    } catch (error) {
      console.error(`Error in syncDelete for ${item.table}:`, error)
      return false
    }
  }

  /**
   * Resolve data conflicts
   */
  private static async resolveConflict(
    localItem: SyncItem,
    serverData: any
  ): Promise<ConflictResolution | null> {
    try {
      // Get stored conflict resolution preferences
      const resolutionsData = await AsyncStorage.getItem(this.CONFLICT_RESOLUTION_KEY)
      const resolutions = resolutionsData ? JSON.parse(resolutionsData) : {}
      
      const conflictKey = `${localItem.table}_${localItem.data.id}`
      const storedResolution = resolutions[conflictKey]

      // Use stored resolution strategy if available
      const strategy = storedResolution?.strategy || 'client_wins' // Default strategy

      switch (strategy) {
        case 'client_wins':
          return {
            strategy: 'client_wins',
            resolvedData: localItem.data
          }

        case 'server_wins':
          return {
            strategy: 'server_wins',
            resolvedData: serverData
          }

        case 'merge':
          return {
            strategy: 'merge',
            resolvedData: this.mergeData(localItem.data, serverData)
          }

        case 'manual':
          // For manual resolution, we'd need to present this to the user
          // For now, fall back to client_wins
          return {
            strategy: 'client_wins',
            resolvedData: localItem.data
          }

        default:
          return {
            strategy: 'client_wins',
            resolvedData: localItem.data
          }
      }
    } catch (error) {
      console.error('Error resolving conflict:', error)
      return null
    }
  }

  /**
   * Merge local and server data
   */
  private static mergeData(localData: any, serverData: any): any {
    // Simple merge strategy - prefer local data for most fields,
    // but keep server timestamps and IDs
    return {
      ...serverData,
      ...localData,
      id: serverData.id,
      created_at: serverData.created_at,
      updated_at: new Date().toISOString()
    }
  }

  /**
   * Update local ID mapping after successful sync
   */
  private static async updateLocalIdMapping(
    table: string,
    localId: string,
    serverId: string,
    userId: string
  ): Promise<void> {
    try {
      // Update cached data with real ID
      switch (table) {
        case 'clients':
          await OfflineStorageService.updateClientId(localId, serverId, userId)
          break
        case 'tasks':
          await OfflineStorageService.updateTaskId(localId, serverId, userId)
          break
        case 'messages':
          await OfflineStorageService.updateMessageId(localId, serverId, userId)
          break
      }
    } catch (error) {
      console.error('Error updating local ID mapping:', error)
    }
  }

  /**
   * Perform full synchronization
   */
  static async performFullSync(userId?: string): Promise<SyncResult> {
    if (!this.isOnline) {
      return { success: false, synced: 0, failed: 0, conflicts: 0, errors: ['Device is offline'] }
    }

    try {
      // First, process any pending sync queue items
      const queueResult = await this.processSyncQueue()
      
      // Then, fetch latest data from server
      if (userId) {
        await this.fetchLatestData(userId)
      }

      // Sync queued analytics events
      await AnalyticsService.syncQueuedEvents()

      return queueResult
    } catch (error) {
      console.error('Error performing full sync:', error)
      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: 0,
        errors: [`Full sync failed: ${error}`]
      }
    }
  }

  /**
   * Fetch latest data from server with timeout
   */
  private static async fetchLatestData(userId: string): Promise<void> {
    try {
      // Validate userId
      if (!userId || typeof userId !== 'string') {
        console.error('Invalid userId provided to fetchLatestData:', userId)
        return
      }

      const lastSyncData = await AsyncStorage.getItem(this.LAST_SYNC_KEY)
      const lastSync = lastSyncData ? new Date(lastSyncData) : new Date(0)
      const FETCH_TIMEOUT = 10000 // 10 seconds timeout

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Fetch timeout')), FETCH_TIMEOUT)
      })

      // Fetch updated data since last sync with timeout
      // Use proper query builders to avoid URL encoding issues
      const fetchPromise = Promise.all([
        supabase
          .from('clients')
          .select('*')
          .eq('created_by', userId)
          .gte('updated_at', lastSync.toISOString())
          .limit(1000), // Add reasonable limit
        supabase
          .from('tasks')
          .select('*')
          .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
          .gte('updated_at', lastSync.toISOString())
          .limit(1000), // Add reasonable limit
        supabase
          .from('messages')
          .select('*')
          .eq('sender_id', userId)
          .gte('updated_at', lastSync.toISOString())
          .limit(1000) // Add reasonable limit
      ])

      const [clientsResult, tasksResult, messagesResult] = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any

      // Check for errors in individual queries
      if (clientsResult.error) {
        console.error('Error fetching clients:', {
          error: clientsResult.error.message,
          code: clientsResult.error.code,
          details: clientsResult.error.details,
          hint: clientsResult.error.hint,
          userId
        })
        // If user doesn't have any assigned clients, that's normal
        if (clientsResult.error.code === 'PGRST116') {
          console.log('No clients found for user, this is normal for new users')
        }
      } else if (clientsResult.data) {
        await OfflineStorageService.cacheClients(clientsResult.data)
      }

      if (tasksResult.error) {
        console.error('Error fetching tasks:', {
          error: tasksResult.error.message,
          code: tasksResult.error.code,
          details: tasksResult.error.details,
          hint: tasksResult.error.hint,
          userId
        })
        // If user doesn't have any tasks, that's normal
        if (tasksResult.error.code === 'PGRST116') {
          console.log('No tasks found for user, this is normal for new users')
        }
      } else if (tasksResult.data) {
        await OfflineStorageService.cacheTasks(tasksResult.data)
      }

      if (messagesResult.error) {
        console.error('Error fetching messages:', {
          error: messagesResult.error.message,
          code: messagesResult.error.code,
          details: messagesResult.error.details,
          hint: messagesResult.error.hint,
          userId
        })
        // If user doesn't have any messages, that's normal
        if (messagesResult.error.code === 'PGRST116') {
          console.log('No messages found for user, this is normal for new users')
        }
      } else if (messagesResult.data) {
        await OfflineStorageService.cacheMessages(messagesResult.data)
      }
    } catch (error) {
      console.error('Error fetching latest data:', error)
      // Log specific error details for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          userId: userId
        })
      }
      // Don't throw error - let sync continue in background
    }
  }

  /**
   * Set conflict resolution strategy
   */
  static async setConflictResolutionStrategy(
    table: string,
    itemId: string,
    strategy: 'client_wins' | 'server_wins' | 'merge' | 'manual'
  ): Promise<void> {
    try {
      const resolutionsData = await AsyncStorage.getItem(this.CONFLICT_RESOLUTION_KEY)
      const resolutions = resolutionsData ? JSON.parse(resolutionsData) : {}
      
      const conflictKey = `${table}_${itemId}`
      resolutions[conflictKey] = { strategy, timestamp: new Date().toISOString() }
      
      await AsyncStorage.setItem(this.CONFLICT_RESOLUTION_KEY, JSON.stringify(resolutions))
    } catch (error) {
      console.error('Error setting conflict resolution strategy:', error)
    }
  }

  /**
   * Get sync status
   */
  static async getSyncStatus(): Promise<{
    isOnline: boolean
    lastSync: string | null
    pendingItems: number
    syncInProgress: boolean
  }> {
    try {
      const lastSyncData = await AsyncStorage.getItem(this.LAST_SYNC_KEY)
      const queueData = await AsyncStorage.getItem(this.SYNC_QUEUE_KEY)
      const queue: SyncItem[] = queueData ? JSON.parse(queueData) : []

      return {
        isOnline: this.isOnline,
        lastSync: lastSyncData,
        pendingItems: queue.length,
        syncInProgress: this.syncInProgress
      }
    } catch (error) {
      console.error('Error getting sync status:', error)
      return {
        isOnline: this.isOnline,
        lastSync: null,
        pendingItems: 0,
        syncInProgress: this.syncInProgress
      }
    }
  }

  /**
   * Clear all sync data
   */
  static async clearSyncData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.SYNC_QUEUE_KEY),
        AsyncStorage.removeItem(this.LAST_SYNC_KEY),
        AsyncStorage.removeItem(this.CONFLICT_RESOLUTION_KEY)
      ])
    } catch (error) {
      console.error('Error clearing sync data:', error)
    }
  }

  /**
   * Cleanup service when user signs out
   */
  static async cleanup(): Promise<void> {
    try {
      // Stop any ongoing sync operations
      this.syncInProgress = false
      
      // Clear sync data
      await this.clearSyncData()
      
      console.log('DataSynchronizationService cleanup completed')
    } catch (error) {
      console.error('Error during DataSynchronizationService cleanup:', error)
    }
  }
}