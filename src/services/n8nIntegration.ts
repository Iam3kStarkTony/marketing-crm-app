import { supabase } from './supabase'
import { Client, Task, Message } from '../types/database'

interface N8nWebhookPayload {
  event: string
  data: any
  timestamp: string
  userId?: string
}

interface WorkflowTrigger {
  workflowId: string
  event: string
  data: any
}

export class N8nIntegrationService {
  private static readonly WEBHOOK_URL = process.env.N8N_WEBHOOK_URL
  private static readonly API_KEY = process.env.N8N_API_KEY
  private static readonly BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678'
  private static readonly SUPABASE_FUNCTIONS_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`

  /**
   * Send data to n8n webhook via Supabase Edge Function
   */
  static async sendWebhook(payload: N8nWebhookPayload): Promise<boolean> {
    try {
      if (!this.WEBHOOK_URL) {
        console.warn('N8N_WEBHOOK_URL not configured')
        return false
      }

      const response = await fetch(this.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.API_KEY && { 'Authorization': `Bearer ${this.API_KEY}` })
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
      }

      console.log('Webhook sent successfully:', payload.event)
      return true
    } catch (error) {
      console.error('Error sending webhook:', error)
      return false
    }
  }

  /**
   * Call specific n8n workflow via dedicated Supabase Edge Function
   */
  static async callN8nWorkflow(workflow: string, data: any): Promise<any> {
    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('User not authenticated')
      }

      // Map workflow names to function endpoints
      const workflowEndpoints: { [key: string]: string } = {
        'client-onboarding': 'client-onboarding',
        'communication': 'communication',
        'reporting': 'reporting',
        'task-management': 'task-management'
      }

      const endpoint = workflowEndpoints[workflow]
      if (!endpoint) {
        throw new Error(`Unknown workflow: ${workflow}`)
      }

      const functionUrl = `${this.SUPABASE_FUNCTIONS_URL}/${endpoint}`
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`n8n workflow failed: ${response.status} ${response.statusText} - ${errorData.error || ''}`)
      }

      const result = await response.json()
      console.log('n8n workflow executed successfully:', workflow)
      return result
    } catch (error) {
      console.error('Error calling n8n workflow:', error)
      throw error
    }
  }

  /**
   * Create client via n8n workflow
   */
  static async createClient(clientData: any): Promise<any> {
    return await this.callN8nWorkflow('client-onboarding', clientData)
  }

  /**
   * Trigger a specific n8n workflow
   */
  static async triggerWorkflow(trigger: WorkflowTrigger): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/api/v1/workflows/${trigger.workflowId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.API_KEY && { 'X-N8N-API-KEY': this.API_KEY })
        },
        body: JSON.stringify({
          event: trigger.event,
          data: trigger.data,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error(`Workflow trigger failed: ${response.status} ${response.statusText}`)
      }

      console.log('Workflow triggered successfully:', trigger.workflowId)
      return true
    } catch (error) {
      console.error('Error triggering workflow:', error)
      return false
    }
  }

  /**
   * Handle client-related events
   */
  static async handleClientEvent(event: 'created' | 'updated' | 'deleted', client: Client, userId: string): Promise<void> {
    const payload: N8nWebhookPayload = {
      event: `client.${event}`,
      data: {
        client,
        userId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      userId
    }

    await this.sendWebhook(payload)

    // Trigger specific workflows based on event
    switch (event) {
      case 'created':
        await this.triggerClientWelcomeWorkflow(client, userId)
        break
      case 'updated':
        await this.triggerClientUpdateWorkflow(client, userId)
        break
    }
  }

  /**
   * Handle task-related events
   */
  static async handleTaskEvent(event: 'created' | 'updated' | 'completed' | 'overdue', task: Task, userId: string): Promise<void> {
    try {
      // Use Supabase edge function for task management
      const payload = {
        event: `task.${event}`,
        data: {
          task,
          userId,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        userId
      }

      // Call the task-management edge function
      await this.callN8nWorkflow('task-management', payload)
      console.log(`Task ${event} event processed successfully for task:`, task.id)
    } catch (error) {
      console.error(`Error handling task ${event} event:`, error)
      // Don't throw the error to prevent task creation/update from failing
    }
  }

  /**
   * Handle message-related events
   */
  static async handleMessageEvent(event: 'sent' | 'received', message: Message, userId: string): Promise<void> {
    const payload: N8nWebhookPayload = {
      event: `message.${event}`,
      data: {
        message,
        userId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      userId
    }

    await this.sendWebhook(payload)

    // Trigger auto-response workflow for received messages
    if (event === 'received') {
      await this.triggerAutoResponseWorkflow(message, userId)
    }
  }

  /**
   * Trigger client welcome workflow
   */
  private static async triggerClientWelcomeWorkflow(client: Client, userId: string): Promise<void> {
    await this.triggerWorkflow({
      workflowId: 'client-welcome',
      event: 'client.welcome',
      data: { client, userId }
    })
  }

  /**
   * Trigger client update workflow
   */
  private static async triggerClientUpdateWorkflow(client: Client, userId: string): Promise<void> {
    await this.triggerWorkflow({
      workflowId: 'client-update',
      event: 'client.update',
      data: { client, userId }
    })
  }



  /**
   * Trigger auto-response workflow
   */
  private static async triggerAutoResponseWorkflow(message: Message, userId: string): Promise<void> {
    await this.triggerWorkflow({
      workflowId: 'auto-response',
      event: 'message.auto_response',
      data: { message, userId }
    })
  }

  /**
   * Check overdue tasks and trigger notifications
   */
  static async checkOverdueTasks(userId: string): Promise<void> {
    try {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .lt('due_date', new Date().toISOString())

      if (error) {
        throw error
      }

      for (const task of tasks || []) {
        await this.handleTaskEvent('overdue', task, userId)
      }
    } catch (error) {
      console.error('Error checking overdue tasks:', error)
    }
  }

  /**
   * Send daily summary workflow
   */
  static async sendDailySummary(userId: string): Promise<void> {
    try {
      // Get today's data
      const today = new Date().toISOString().split('T')[0]
      
      const [clientsResult, tasksResult, messagesResult] = await Promise.all([
        supabase
          .from('clients')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', `${today}T00:00:00.000Z`),
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', `${today}T00:00:00.000Z`),
        supabase
          .from('messages')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', `${today}T00:00:00.000Z`)
      ])

      const summary = {
        date: today,
        newClients: clientsResult.data?.length || 0,
        newTasks: tasksResult.data?.length || 0,
        newMessages: messagesResult.data?.length || 0,
        clients: clientsResult.data || [],
        tasks: tasksResult.data || [],
        messages: messagesResult.data || []
      }

      await this.triggerWorkflow({
        workflowId: 'daily-summary',
        event: 'summary.daily',
        data: { summary, userId }
      })
    } catch (error) {
      console.error('Error sending daily summary:', error)
    }
  }

  /**
   * Test n8n connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      const testPayload: N8nWebhookPayload = {
        event: 'test.connection',
        data: { message: 'Test connection from CRM app' },
        timestamp: new Date().toISOString()
      }

      return await this.sendWebhook(testPayload)
    } catch (error) {
      console.error('Error testing n8n connection:', error)
      return false
    }
  }
}