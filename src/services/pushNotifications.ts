import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { supabase } from './supabase'

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export interface NotificationData {
  type: 'message' | 'task' | 'reminder' | 'system'
  title: string
  body: string
  data?: Record<string, any>
}

export class PushNotificationService {
  static async registerForPushNotifications(): Promise<string | null> {
    let token: string | null = null

    // Handle web platform differently
    if (Platform.OS === 'web') {
      console.log('Push notifications on web require VAPID configuration in app.json')
      
      // Check if VAPID key is configured
      const vapidPublicKey = Constants.expoConfig?.notification?.vapidPublicKey
      if (!vapidPublicKey || vapidPublicKey === 'YOUR_VAPID_PUBLIC_KEY_HERE') {
        console.warn('VAPID public key not configured. Please set notification.vapidPublicKey in app.json for web push notifications.')
        return null
      }
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      })
    }

    // For web, we don't need to check Device.isDevice
    const shouldRegister = Platform.OS === 'web' || Device.isDevice
    
    if (shouldRegister) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!')
        return null
      }
      
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
        if (!projectId) {
          throw new Error('Project ID not found')
        }
        
        token = (await Notifications.getExpoPushTokenAsync({
          projectId,
        })).data
        
        console.log('Push notification token:', token)
      } catch (error) {
        console.error('Error getting push token:', error)
        if (Platform.OS === 'web' && error.message?.includes('vapidPublicKey')) {
          console.error('Web push notifications require VAPID configuration. Please set notification.vapidPublicKey in app.json')
        }
        return null
      }
    } else {
      console.log('Must use physical device for Push Notifications')
    }

    return token
  }

  static async savePushTokenToProfile(token: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId)

      if (error) {
        console.error('Error saving push token:', error)
      } else {
        console.log('Push token saved successfully')
      }
    } catch (error) {
      console.error('Error saving push token:', error)
    }
  }

  static async removePushTokenFromProfile(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: null })
        .eq('id', userId)

      if (error) {
        console.error('Error removing push token:', error)
      } else {
        console.log('Push token removed successfully')
      }
    } catch (error) {
      console.error('Error removing push token:', error)
    }
  }

  static async scheduleLocalNotification(
    notification: NotificationData,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: 'default',
        },
        trigger: trigger || null,
      })
      
      return identifier
    } catch (error) {
      console.error('Error scheduling local notification:', error)
      throw error
    }
  }

  static async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier)
    } catch (error) {
      console.error('Error canceling notification:', error)
    }
  }

  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync()
    } catch (error) {
      console.error('Error canceling all notifications:', error)
    }
  }

  static async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync()
    } catch (error) {
      console.error('Error getting badge count:', error)
      return 0
    }
  }

  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count)
    } catch (error) {
      console.error('Error setting badge count:', error)
    }
  }

  static async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0)
    } catch (error) {
      console.error('Error clearing badge:', error)
    }
  }

  // Schedule task reminder notifications
  static async scheduleTaskReminder(
    taskId: string,
    taskTitle: string,
    dueDate: Date,
    reminderMinutes: number = 60
  ): Promise<string | null> {
    try {
      const reminderTime = new Date(dueDate.getTime() - reminderMinutes * 60 * 1000)
      
      if (reminderTime <= new Date()) {
        console.log('Reminder time is in the past, not scheduling')
        return null
      }

      const identifier = await this.scheduleLocalNotification(
        {
          type: 'reminder',
          title: 'Task Reminder',
          body: `"${taskTitle}" is due soon`,
          data: {
            taskId,
            type: 'task_reminder',
          },
        },
        {
          date: reminderTime,
        }
      )

      return identifier
    } catch (error) {
      console.error('Error scheduling task reminder:', error)
      return null
    }
  }

  // Handle notification responses
  static addNotificationResponseListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener)
  }

  // Handle notifications received while app is in foreground
  static addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener)
  }

  // Get notification permissions status
  static async getPermissionsStatus(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.getPermissionsAsync()
  }

  // Request notification permissions
  static async requestPermissions(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.requestPermissionsAsync()
  }
}