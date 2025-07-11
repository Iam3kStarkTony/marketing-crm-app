import AsyncStorage from '@react-native-async-storage/async-storage'
import { Client, Task, Message } from '../types/database'

const STORAGE_KEYS = {
  CLIENTS: '@crm_clients',
  TASKS: '@crm_tasks',
  MESSAGES: '@crm_messages',
  PENDING_SYNC: '@crm_pending_sync',
  LAST_SYNC: '@crm_last_sync',
}

interface PendingSyncItem {
  id: string
  type: 'client' | 'task' | 'message'
  action: 'create' | 'update' | 'delete'
  data: any
  timestamp: string
}

export class OfflineStorageService {
  // Cache data locally
  static async cacheClients(clients: Client[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients))
    } catch (error) {
      console.error('Error caching clients:', error)
    }
  }

  static async cacheTasks(tasks: Task[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks))
    } catch (error) {
      console.error('Error caching tasks:', error)
    }
  }

  static async cacheMessages(messages: Message[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages))
    } catch (error) {
      console.error('Error caching messages:', error)
    }
  }

  // Retrieve cached data
  static async getCachedClients(): Promise<Client[]> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CLIENTS)
      return cached ? JSON.parse(cached) : []
    } catch (error) {
      console.error('Error retrieving cached clients:', error)
      return []
    }
  }

  static async getCachedTasks(): Promise<Task[]> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.TASKS)
      return cached ? JSON.parse(cached) : []
    } catch (error) {
      console.error('Error retrieving cached tasks:', error)
      return []
    }
  }

  static async getCachedMessages(): Promise<Message[]> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES)
      return cached ? JSON.parse(cached) : []
    } catch (error) {
      console.error('Error retrieving cached messages:', error)
      return []
    }
  }

  // Pending sync operations
  static async addPendingSyncItem(item: Omit<PendingSyncItem, 'id' | 'timestamp'>): Promise<void> {
    try {
      const pendingItems = await this.getPendingSyncItems()
      const newItem: PendingSyncItem = {
        ...item,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
      }
      pendingItems.push(newItem)
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(pendingItems))
    } catch (error) {
      console.error('Error adding pending sync item:', error)
    }
  }

  static async getPendingSyncItems(): Promise<PendingSyncItem[]> {
    try {
      const pending = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SYNC)
      return pending ? JSON.parse(pending) : []
    } catch (error) {
      console.error('Error retrieving pending sync items:', error)
      return []
    }
  }

  static async removePendingSyncItem(itemId: string): Promise<void> {
    try {
      const pendingItems = await this.getPendingSyncItems()
      const filteredItems = pendingItems.filter(item => item.id !== itemId)
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(filteredItems))
    } catch (error) {
      console.error('Error removing pending sync item:', error)
    }
  }

  static async clearPendingSyncItems(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_SYNC)
    } catch (error) {
      console.error('Error clearing pending sync items:', error)
    }
  }

  // Last sync timestamp
  static async setLastSyncTime(timestamp: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp)
    } catch (error) {
      console.error('Error setting last sync time:', error)
    }
  }

  static async getLastSyncTime(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC)
    } catch (error) {
      console.error('Error getting last sync time:', error)
      return null
    }
  }

  // Clear all cached data
  static async clearAllCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CLIENTS,
        STORAGE_KEYS.TASKS,
        STORAGE_KEYS.MESSAGES,
        STORAGE_KEYS.PENDING_SYNC,
        STORAGE_KEYS.LAST_SYNC,
      ])
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }

  // Check if data is stale (older than specified minutes)
  static async isDataStale(maxAgeMinutes: number = 30): Promise<boolean> {
    try {
      const lastSync = await this.getLastSyncTime()
      if (!lastSync) return true
      
      const lastSyncTime = new Date(lastSync).getTime()
      const now = new Date().getTime()
      const ageInMinutes = (now - lastSyncTime) / (1000 * 60)
      
      return ageInMinutes > maxAgeMinutes
    } catch (error) {
      console.error('Error checking data staleness:', error)
      return true
    }
  }

  // Get cache size info
  static async getCacheInfo(): Promise<{
    clientsCount: number
    tasksCount: number
    messagesCount: number
    pendingSyncCount: number
    lastSync: string | null
  }> {
    try {
      const [clients, tasks, messages, pendingSync, lastSync] = await Promise.all([
        this.getCachedClients(),
        this.getCachedTasks(),
        this.getCachedMessages(),
        this.getPendingSyncItems(),
        this.getLastSyncTime(),
      ])

      return {
        clientsCount: clients.length,
        tasksCount: tasks.length,
        messagesCount: messages.length,
        pendingSyncCount: pendingSync.length,
        lastSync,
      }
    } catch (error) {
      console.error('Error getting cache info:', error)
      return {
        clientsCount: 0,
        tasksCount: 0,
        messagesCount: 0,
        pendingSyncCount: 0,
        lastSync: null,
      }
    }
  }
}