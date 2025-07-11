// Database type definitions based on Supabase schema
// Generated from the initial_schema.sql migration

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
      clients: {
        Row: Client
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>
      }
      tasks: {
        Row: Task
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Message, 'id' | 'created_at' | 'updated_at'>>
      }
      file_attachments: {
        Row: FileAttachment
        Insert: Omit<FileAttachment, 'id' | 'created_at'>
        Update: Partial<Omit<FileAttachment, 'id' | 'created_at'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>
      }
    }
  }
}

// Core entity types
export interface Profile {
  id: string
  email: string
  full_name: string | null;
  avatar_url: string | null
  role: 'admin' | 'manager' | 'agent'
  phone: string | null
  department: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  company: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  country: string
  status: 'active' | 'inactive' | 'prospect' | 'lead'
  source: string | null
  created_by: string
  notes: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to: string | null
  created_by: string
  client_id: string | null
  assignment_type: 'agent' | 'client' | 'todo'
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  client_id: string | null
  sender_id: string | null
  sender_type: 'agent' | 'client' | 'admin' | 'manager'
  content: string
  message_type: 'text' | 'email' | 'sms' | 'call_log'
  message_category: 'client_communication' | 'team_communication'
  recipient_id: string | null
  is_read: boolean
  metadata: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface ConversationParticipant {
  participant_id: string
  participant_name: string
  participant_role: string
  participant_avatar: string | null
  last_message: string
  last_message_time: string | null
  unread_count: number
  conversation_type: 'client_communication' | 'team_communication'
}

export interface FileAttachment {
  id: string
  filename: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  uploaded_by: string
  client_id: string | null
  task_id: string | null
  message_id: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  data: Record<string, any> | null
  created_at: string
}

// Extended types with relations
export interface ClientWithTasks extends Client {
  tasks?: Task[]
}

export interface TaskWithRelations extends Task {
  assigned_to_profile?: Profile | null
  assigned_user?: Profile | null
  created_by_profile?: Profile | null
  client?: Client | null
  attachments?: FileAttachment[]
}

export interface MessageWithSender extends Message {
  sender?: Profile | null
  client?: Client | null
  attachments?: FileAttachment[]
}

// Form types for creating/updating entities
export type CreateClientData = Omit<Client, 'id' | 'created_at' | 'updated_at'>
export type UpdateClientData = Partial<CreateClientData>

export type CreateTaskData = Omit<Task, 'id' | 'created_at' | 'updated_at'>
export type UpdateTaskData = Partial<CreateTaskData>

export type CreateMessageData = Omit<Message, 'id' | 'created_at' | 'updated_at'>
export type UpdateMessageData = Partial<CreateMessageData>

// API response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  limit: number
  hasMore: boolean
}

// Filter and sort types
export interface ClientFilters {
  status?: Client['status']
  search?: string
}

export interface TaskFilters {
  status?: Task['status']
  priority?: Task['priority']
  assigned_to?: string
  client_id?: string
  assignment_type?: Task['assignment_type']
  search?: string
}

export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  profile?: Profile
}

export interface SignInData {
  email: string
  password: string
}

export interface SignUpData {
  email: string
  password: string
  full_name: string
  role?: Profile['role']
}

// Real-time subscription types
export interface RealtimePayload<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: T
  schema: string
  table: string
}

export type RealtimeCallback<T = any> = (payload: RealtimePayload<T>) => void