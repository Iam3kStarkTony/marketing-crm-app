import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase, getUserProfile } from '../services/supabase'
import { DataSynchronizationService } from '../services/dataSynchronization'
import { AnalyticsService } from '../services/analytics'
import { Profile, SignInData, SignUpData } from '../types/database'

interface AuthContextType {
  // State
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  
  // Actions
  signIn: (data: SignInData) => Promise<{ error?: AuthError }>
  signUp: (data: SignUpData) => Promise<{ error?: AuthError }>
  signOut: () => Promise<{ error?: AuthError }>
  resetPassword: (email: string) => Promise<{ error?: AuthError }>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error?: any }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize services when user is authenticated
  const initializeServices = async (userId: string) => {
    try {
      // Initialize DataSynchronizationService with userId parameter
      await DataSynchronizationService.initialize(userId)
      AnalyticsService.setUserId(userId)
    } catch (error) {
      console.error('Error initializing services:', error)
      // Don't block authentication if service initialization fails
    }
  }

  // Cleanup services when user signs out
  const cleanupServices = async () => {
    try {
      await DataSynchronizationService.cleanup()
      AnalyticsService.clearUserId()
    } catch (error) {
      console.error('Error cleaning up services:', error)
    }
  }

  // Initialize auth state
  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...')
        // Get initial session
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Error getting session:', sessionError)
        }
        
        console.log('Initial session:', initialSession?.user?.email || 'No user')
        
        if (mounted) {
          setSession(initialSession)
          setUser(initialSession?.user ?? null)
          
          if (initialSession?.user) {
            try {
              // Load user profile first (this is critical)
              await loadUserProfile(initialSession.user.id)
              
              // Initialize services in background - don't block auth
              initializeServices(initialSession.user.id).catch(error => {
                console.error('Service initialization failed during auth init (non-blocking):', error)
              })
            } catch (profileError) {
              console.error('Error loading profile:', profileError)
              // Continue anyway - don't block the app
            }
          }
          
          console.log('Auth initialization complete, setting loading to false')
          setLoading(false)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          console.log('Setting loading to false due to error')
          setLoading(false)
        }
      }
    }

    // Set a timeout to ensure loading doesn't hang indefinitely
    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth initialization timeout - forcing loading to false')
        setLoading(false)
      }
    }, 15000) // 15 second timeout (increased from 10s)

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        if (mounted) {
          try {
            if (session?.user) {
              // Validate session is not expired
              const now = Math.floor(Date.now() / 1000)
              if (session.expires_at && session.expires_at < now) {
                console.warn('Session expired, signing out')
                await supabase.auth.signOut()
                return
              }
              
              setSession(session)
              setUser(session.user)
              
              // Load user profile
              await loadUserProfile(session.user.id)
              
              // Initialize services in background - don't block authentication
              initializeServices(session.user.id).catch(error => {
                console.error('Service initialization failed (non-blocking):', error)
              })
            } else {
              setSession(null)
              setUser(null)
              setProfile(null)
              
              // Cleanup services
              await cleanupServices()
            }
          } catch (error) {
            console.error('Error in auth state change:', error)
            // On error, ensure we don't stay in loading state
            setSession(null)
            setUser(null)
            setProfile(null)
          } finally {
            setLoading(false)
          }
        }
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  // Load user profile from database
  const loadUserProfile = async (userId: string) => {
    try {
      console.log('Loading user profile for:', userId)
      const userProfile = await getUserProfile(userId)
      console.log('Profile loaded successfully:', userProfile?.email)
      setProfile(userProfile)
    } catch (error) {
      console.error('Error loading user profile:', error)
      // If profile doesn't exist, that's okay - user might need to complete setup
      if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116') {
        console.log('No profile found for user, this is normal for new users')
      }
      setProfile(null)
    }
  }

  // Sign in with email and password
  const signIn = async ({ email, password }: SignInData) => {
    try {
      setLoading(true)
      console.log('Attempting sign in with:', { email, passwordLength: password.length })
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      console.log('Sign in response:', { data, error })
      
      if (error) {
        console.error('Sign in error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
          cause: error.cause
        })
      }
      
      return { error: error || undefined }
    } catch (error) {
      console.error('Sign in catch error:', error)
      return { error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }

  // Sign up with email and password
  const signUp = async ({ email, password, full_name, role = 'agent' }: SignUpData) => {
    try {
      setLoading(true)
      
      // Create auth user - the trigger function will automatically create the profile
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
            role,
          },
        },
      })

      if (error) {
        return { error }
      }

      // Profile creation is handled automatically by the database trigger
      // No need to manually insert profile record

      return { error: undefined }
    } catch (error) {
      console.error('Sign up error:', error)
      return { error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true)
      
      // Cleanup services before signing out
      await cleanupServices()
      
      const { error } = await supabase.auth.signOut()
      
      // Clear local state
      setSession(null)
      setUser(null)
      setProfile(null)
      
      return { error: error || undefined }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'your-app://reset-password', // Configure this for your app
      })
      
      return { error: error || undefined }
    } catch (error) {
      console.error('Reset password error:', error)
      return { error: error as AuthError }
    }
  }

  // Update user profile
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      return { error: new Error('No authenticated user') }
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (error) {
        return { error }
      }

      // Refresh profile data
      await loadUserProfile(user.id)
      
      return { error: undefined }
    } catch (error) {
      console.error('Update profile error:', error)
      return { error }
    }
  }

  // Refresh profile data
  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id)
    }
  }

  const value: AuthContextType = {
    session,
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext