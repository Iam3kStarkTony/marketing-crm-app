import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import 'react-native-url-polyfill/auto'
import { Platform } from 'react-native'

// Environment variables - these should be set in your .env file
// For Expo web, use EXPO_PUBLIC_ prefix to make variables accessible in browser
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://cjwhknoitsbpbaweprzy.supabase.co'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqd2hrbm9pdHNicGJhd2Vwcnp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MzI0MTUsImV4cCI6MjA2NjMwODQxNX0.Ed3LldDva24H5ULyypgvZKXbs_BAA27RAlNql3bLZYY'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Platform-specific storage configuration
const getAuthConfig = () => {
  if (Platform.OS === 'web') {
    // For web, use default browser storage (localStorage)
    return {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    }
  } else {
    // For React Native, use AsyncStorage
    return {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    }
  }
}

// Create Supabase client with platform-specific configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: getAuthConfig(),
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Database table names for type safety
export const TABLES = {
  PROFILES: 'profiles',
  CLIENTS: 'clients',
  TASKS: 'tasks',
  MESSAGES: 'messages',
  FILE_ATTACHMENTS: 'file_attachments',
  NOTIFICATIONS: 'notifications',
} as const

// Storage bucket names
export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  ATTACHMENTS: 'attachments',
} as const

// Helper function to get the current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error getting current user:', error)
    return null
  }
  return user
}

// Helper function to get user profile
export const getUserProfile = async (userId?: string) => {
  const user = userId || (await getCurrentUser())?.id
  if (!user) return null

  const { data, error } = await supabase
    .from(TABLES.PROFILES)
    .select('*')
    .eq('id', user)
    .single()

  if (error) {
    console.error('Error getting user profile:', error)
    return null
  }

  return data
}

// Helper function to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}

// Helper function to sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Error signing out:', error)
    throw error
  }
}

export default supabase