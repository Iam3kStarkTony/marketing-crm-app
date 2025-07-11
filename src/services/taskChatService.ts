import { supabase } from './supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface TaskMessage {
  id: string
  task_id: string
  sender_id: string
  message_text: string | null
  message_type: 'user' | 'system'
  created_at: string
  updated_at: string
  sender?: {
    id: string
    full_name: string
    role: string
  }
}

export interface TaskChatSubscription {
  channel: RealtimeChannel
  unsubscribe: () => void
}

class TaskChatService {
  private subscriptions: Map<string, RealtimeChannel> = new Map()

  /**
   * Subscribe to real-time messages for a specific task
   */
  subscribeToTaskMessages(
    taskId: string,
    onMessage: (message: TaskMessage) => void,
    onError?: (error: any) => void
  ): TaskChatSubscription {
    // Remove existing subscription if any
    this.unsubscribeFromTask(taskId)

    console.log('Creating subscription channel for task:', taskId)
    const channel = supabase
      .channel(`task-messages-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_messages',
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          console.log('Real-time event received:', payload)
          try {
            // Fetch the complete message with sender info
            const { data: message, error } = await supabase
              .from('task_messages')
              .select(`
                *,
                sender:profiles!task_messages_sender_id_fkey(
                  id,
                  full_name,
                  role
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (error) {
              console.error('Error fetching new message:', error)
              onError?.(error)
              return
            }

            console.log('Fetched complete message:', message)
            onMessage(message as TaskMessage)
          } catch (error) {
            console.error('Error processing new message:', error)
            onError?.(error)
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })

    this.subscriptions.set(taskId, channel)

    return {
      channel,
      unsubscribe: () => this.unsubscribeFromTask(taskId),
    }
  }

  /**
   * Unsubscribe from task messages
   */
  unsubscribeFromTask(taskId: string): void {
    const channel = this.subscriptions.get(taskId)
    if (channel) {
      supabase.removeChannel(channel)
      this.subscriptions.delete(taskId)
    }
  }

  /**
   * Unsubscribe from all task message subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((channel) => {
      supabase.removeChannel(channel)
    })
    this.subscriptions.clear()
  }

  /**
   * Fetch existing messages for a task
   */
  async fetchTaskMessages(taskId: string): Promise<TaskMessage[]> {
    try {
      const { data, error } = await supabase
        .from('task_messages')
        .select(`
          *,
          sender:profiles!task_messages_sender_id_fkey(
            id,
            full_name,
            role
          )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching task messages:', error)
        throw error
      }

      return data as TaskMessage[]
    } catch (error) {
      console.error('Error in fetchTaskMessages:', error)
      throw error
    }
  }

  /**
   * Send a user message
   */
  async sendMessage(taskId: string, messageText: string): Promise<TaskMessage> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('task_messages')
        .insert({
          task_id: taskId,
          sender_id: user.id,
          message_text: messageText,
          message_type: 'user',
        })
        .select(`
          *,
          sender:profiles!task_messages_sender_id_fkey(
            id,
            full_name,
            role
          )
        `)
        .single()

      if (error) {
        console.error('Error sending message:', error)
        throw error
      }

      return data as TaskMessage
    } catch (error) {
      console.error('Error in sendMessage:', error)
      throw error
    }
  }

  /**
   * Send a system message (for status changes, etc.)
   */
  async sendSystemMessage(
    taskId: string,
    messageText: string,
    senderId?: string
  ): Promise<TaskMessage> {
    try {
      let userId = senderId
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('User not authenticated')
        }
        userId = user.id
      }

      const { data, error } = await supabase
        .from('task_messages')
        .insert({
          task_id: taskId,
          sender_id: userId,
          message_text: messageText,
          message_type: 'system',
        })
        .select(`
          *,
          sender:profiles!task_messages_sender_id_fkey(
            id,
            full_name,
            role
          )
        `)
        .single()

      if (error) {
        console.error('Error sending system message:', error)
        throw error
      }

      return data as TaskMessage
    } catch (error) {
      console.error('Error in sendSystemMessage:', error)
      throw error
    }
  }

  /**
   * Update task status and send system message
   */
  async updateTaskStatus(
    taskId: string,
    newStatus: string,
    reason?: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get current task to check old status
      const { data: currentTask, error: fetchError } = await supabase
        .from('tasks')
        .select('status, title')
        .eq('id', taskId)
        .single()

      if (fetchError) {
        throw fetchError
      }

      // Update task status
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(newStatus === 'accepted' && { task_accepted_date: new Date().toISOString() }),
          ...(newStatus === 'completed' && { completed_at: new Date().toISOString() })
        })
        .eq('id', taskId)

      if (updateError) {
        throw updateError
      }

      // Create status history record
      await supabase
        .from('task_status_history')
        .insert({
          task_id: taskId,
          changed_by: user.id,
          old_status: currentTask.status,
          new_status: newStatus,
          change_reason: reason,
        })

      // Send system message
      const statusMessages = {
        pending: 'Task is now pending',
        accepted: 'Task has been accepted',
        in_progress: 'Task is now in progress',
        submitted_for_review: 'Task has been submitted for review',
        completed: 'Task has been completed',
        needs_revision: 'Task needs revision',
        cancelled: 'Task has been cancelled',
      }

      const systemMessage = statusMessages[newStatus as keyof typeof statusMessages] || `Task status changed to ${newStatus}`
      const fullMessage = reason ? `${systemMessage}. Reason: ${reason}` : systemMessage

      await this.sendSystemMessage(taskId, fullMessage, user.id)

    } catch (error) {
      console.error('Error updating task status:', error)
      throw error
    }
  }

  /**
   * Get unread message count for a task
   */
  async getUnreadMessageCount(taskId: string): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return 0
      }

      const { count, error } = await supabase
        .from('task_messages')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', taskId)
        .neq('sender_id', user.id) // Don't count own messages
        .eq('is_read', false)

      if (error) {
        console.error('Error getting unread count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error in getUnreadMessageCount:', error)
      return 0
    }
  }

  /**
   * Get the latest message timestamp for a task
   */
  async getLatestMessageTime(taskId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('task_messages')
        .select('created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error getting latest message time:', error)
        return null
      }

      // Return the first result if any, otherwise null
      return data && data.length > 0 ? data[0].created_at : null
    } catch (error) {
      console.error('Error in getLatestMessageTime:', error)
      return null
    }
  }

  /**
   * Get tasks sorted by latest message activity
   */
  async getTasksWithLatestActivity(taskIds: string[]): Promise<Array<{ taskId: string; latestActivity: string | null }>> {
    try {
      const results = await Promise.all(
        taskIds.map(async (taskId) => {
          const latestActivity = await this.getLatestMessageTime(taskId)
          return { taskId, latestActivity }
        })
      )

      // Sort by latest activity (most recent first), tasks with no messages go to the end
      return results.sort((a, b) => {
        if (!a.latestActivity && !b.latestActivity) return 0
        if (!a.latestActivity) return 1
        if (!b.latestActivity) return -1
        return new Date(b.latestActivity).getTime() - new Date(a.latestActivity).getTime()
      })
    } catch (error) {
      console.error('Error in getTasksWithLatestActivity:', error)
      return taskIds.map(taskId => ({ taskId, latestActivity: null }))
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(taskId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const { error } = await supabase
        .from('task_messages')
        .update({ is_read: true })
        .eq('task_id', taskId)
        .neq('sender_id', user.id) // Don't mark own messages

      if (error) {
        console.error('Error marking messages as read:', error)
      }
    } catch (error) {
      console.error('Error in markMessagesAsRead:', error)
    }
  }
}

export const taskChatService = new TaskChatService()
export default taskChatService