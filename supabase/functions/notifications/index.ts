// Edge Function for handling notifications
// Phase 2.5: Edge Functions Development

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  type: 'task_assigned' | 'task_completed' | 'message_received' | 'client_updated'
  userId: string
  title: string
  message: string
  data?: Record<string, any>
}

interface WebhookPayload {
  type: string
  table: string
  record: any
  old_record?: any
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { type, payload } = await req.json()

    switch (type) {
      case 'webhook':
        await handleWebhook(supabaseClient, payload as WebhookPayload)
        break
      case 'direct':
        await sendNotification(supabaseClient, payload as NotificationPayload)
        break
      default:
        throw new Error(`Unknown notification type: ${type}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Notification error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function handleWebhook(supabaseClient: any, payload: WebhookPayload) {
  const { type, table, record, old_record } = payload

  switch (table) {
    case 'tasks':
      await handleTaskWebhook(supabaseClient, type, record, old_record)
      break
    case 'messages':
      await handleMessageWebhook(supabaseClient, type, record)
      break
    case 'clients':
      await handleClientWebhook(supabaseClient, type, record, old_record)
      break
    default:
      console.log(`Unhandled webhook for table: ${table}`)
  }
}

async function handleTaskWebhook(supabaseClient: any, type: string, record: any, old_record?: any) {
  if (type === 'INSERT' && record.assigned_to) {
    // Task assigned notification
    await sendNotification(supabaseClient, {
      type: 'task_assigned',
      userId: record.assigned_to,
      title: 'New Task Assigned',
      message: `You have been assigned a new task: ${record.title}`,
      data: { taskId: record.id, priority: record.priority }
    })
  } else if (type === 'UPDATE' && old_record?.status !== 'completed' && record.status === 'completed') {
    // Task completed notification - notify the creator
    if (record.created_by && record.created_by !== record.assigned_to) {
      await sendNotification(supabaseClient, {
        type: 'task_completed',
        userId: record.created_by,
        title: 'Task Completed',
        message: `Task "${record.title}" has been completed`,
        data: { taskId: record.id }
      })
    }
  } else if (type === 'UPDATE' && old_record?.assigned_to !== record.assigned_to && record.assigned_to) {
    // Task reassigned notification
    await sendNotification(supabaseClient, {
      type: 'task_assigned',
      userId: record.assigned_to,
      title: 'Task Reassigned',
      message: `You have been assigned a task: ${record.title}`,
      data: { taskId: record.id, priority: record.priority }
    })
  }
}

async function handleMessageWebhook(supabaseClient: any, type: string, record: any) {
  if (type === 'INSERT' && record.sender_type === 'client') {
    // New message from client - find agents with active tasks for this client
    const { data: client } = await supabaseClient
      .from('clients')
      .select('name')
      .eq('id', record.client_id)
      .single()

    // Find agents with active tasks for this client
    const { data: tasks } = await supabaseClient
      .from('tasks')
      .select('assigned_to')
      .eq('client_id', record.client_id)
      .in('status', ['pending', 'in_progress'])

    // Notify all agents with active tasks for this client
    const agentIds = [...new Set(tasks?.map(task => task.assigned_to).filter(Boolean) || [])]
    
    for (const agentId of agentIds) {
      await sendNotification(supabaseClient, {
        type: 'message_received',
        userId: agentId,
        title: 'New Message',
        message: `New message from ${client?.name || 'Client'}`,
        data: { clientId: record.client_id, messageId: record.id }
      })
    }
  }
}

async function handleClientWebhook(supabaseClient: any, type: string, record: any, old_record?: any) {
  // Client webhook handler - no longer using assigned_agent_id
  // Client assignments are now handled through tasks
  if (type === 'INSERT') {
    // New client created - could notify admins/managers
    console.log('New client created:', record.name)
  }
}

async function sendNotification(supabaseClient: any, notification: NotificationPayload) {
  // Store notification in database for persistence
  const { error } = await supabaseClient
    .from('notifications')
    .insert({
      user_id: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      is_read: false
    })

  if (error) {
    console.error('Failed to store notification:', error)
    throw error
  }

  // Here you would integrate with push notification services
  // For example: Firebase Cloud Messaging, Apple Push Notifications, etc.
  console.log('Notification sent:', notification)

  // TODO: Implement actual push notification sending
  // - Get user's device tokens from profiles table
  // - Send push notification via FCM/APNS
  // - Send email notification if enabled
  // - Send SMS notification if enabled
}