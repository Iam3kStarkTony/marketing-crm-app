import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { Platform } from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { spacing, shadows } from '../config/theme'
import FixedSidebarLayout from '../components/FixedSidebarLayout'

// Import screens (we'll create these next)
import LoadingScreen from '../screens/LoadingScreen'
import LoginScreen from '../screens/auth/LoginScreen'
import RegisterScreen from '../screens/auth/RegisterScreen'
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen'

// Main app screens
import DashboardScreenWrapper from '../screens/dashboard/DashboardScreenWrapper'
import ClientDetailScreen from '../screens/clients/ClientDetailScreen'
import AddEditClientScreen from '../screens/clients/AddEditClientScreen'
import TaskDetailScreen from '../screens/tasks/TaskDetailScreen'
import AddEditTaskScreen from '../screens/tasks/AddEditTaskScreen'
import ConversationDetailScreen from '../screens/messages/ConversationDetailScreen'
import NewMessageScreen from '../screens/messages/NewMessageScreen'
import ClientsScreen from '../screens/clients/ClientsScreen'
import TasksScreen from '../screens/tasks/TasksScreen'
import MessagesScreen from '../screens/messages/MessagesScreen'
import ProfileScreen from '../screens/profile/ProfileScreen'
// Team screens
import TeamManagementScreen from '../screens/team/TeamManagementScreen'
import AddTeamMemberScreen from '../screens/team/AddTeamMemberScreen'

import SettingsScreen from '../screens/SettingsScreen'
import HelpScreen from '../screens/HelpScreen'

// Navigation type definitions
export type RootStackParamList = {
  Auth: undefined
  Main: undefined
  Loading: undefined
}

export type AuthStackParamList = {
  Login: undefined
  Register: undefined
  ForgotPassword: undefined
}

export type MainStackParamList = {
  Dashboard: undefined
  Clients: undefined
  Tasks: undefined
  Messages: undefined
  Team: undefined
  Profile: undefined
  Settings: undefined
  Help: undefined
}

export type ClientStackParamList = {
  ClientList: undefined
  ClientDetail: { clientId: string }
  AddEditClient: { clientId?: string }
}

export type TaskStackParamList = {
  TaskList: undefined
  TaskDetail: { taskId: string }
  AddEditTask: { taskId?: string; clientId?: string }
}

export type MessageStackParamList = {
  MessageList: undefined
  Chat: { 
    clientId?: string
    clientName?: string
    recipientId?: string
    recipientName?: string
    participantName?: string
    messageCategory: 'client_communication' | 'team_communication'
  }
}

export type TeamStackParamList = {
  TeamList: undefined
  AddTeamMember: undefined
}

export type ProfileStackParamList = {
  ProfileMain: undefined
  Settings: undefined
}

const RootStack = createNativeStackNavigator<RootStackParamList>()
const AuthStack = createNativeStackNavigator<AuthStackParamList>()
const MainStack = createNativeStackNavigator<MainStackParamList>()
const ClientStack = createNativeStackNavigator<ClientStackParamList>()
const TaskStack = createNativeStackNavigator<TaskStackParamList>()
const MessageStack = createNativeStackNavigator<MessageStackParamList>()
const TeamStack = createNativeStackNavigator<TeamStackParamList>()
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>()

// Auth Stack Navigator
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  )
}

// Client Stack Navigator
const ClientNavigator = () => {
  const { theme } = useTheme()
  
  return (
    <ClientStack.Navigator
      initialRouteName="ClientList"
      screenOptions={{
        headerShown: true,
        animation: 'slide_from_right',
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          color: theme.colors.onSurface,
          fontWeight: '600',
        },
      }}
    >
      <ClientStack.Screen 
        name="ClientList" 
        component={ClientsScreen}
        options={{ title: 'Clients' }}
      />
      <ClientStack.Screen 
        name="ClientDetail" 
        component={ClientDetailScreen}
        options={{ title: 'Client Details' }}
      />
      <ClientStack.Screen 
        name="AddEditClient" 
        component={AddEditClientScreen}
        options={({ route }) => ({
          title: route.params?.clientId ? 'Edit Client' : 'Add Client'
        })}
      />
    </ClientStack.Navigator>
  )
}

// Task Stack Navigator
const TaskNavigator = () => {
  const { theme } = useTheme()
  
  return (
    <TaskStack.Navigator
      initialRouteName="TaskList"
      screenOptions={{
        headerShown: true,
        animation: 'slide_from_right',
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          color: theme.colors.onSurface,
          fontWeight: '600',
        },
      }}
    >
      <TaskStack.Screen 
        name="TaskList" 
        component={TasksScreen}
        options={{ title: 'Tasks' }}
      />
      <TaskStack.Screen 
        name="TaskDetail" 
        component={TaskDetailScreen}
        options={{ title: 'Task Details' }}
      />
      <TaskStack.Screen 
        name="AddEditTask" 
        component={AddEditTaskScreen}
        options={({ route }) => ({
          title: route.params?.taskId ? 'Edit Task' : 'Add Task'
        })}
      />
    </TaskStack.Navigator>
  )
}

// Message Stack Navigator
const MessageNavigator = () => {
  const { theme } = useTheme()
  
  return (
    <MessageStack.Navigator
      initialRouteName="MessageList"
      screenOptions={{
        headerShown: true,
        animation: 'slide_from_right',
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          color: theme.colors.onSurface,
          fontWeight: '600',
        },
      }}
    >
      <MessageStack.Screen 
        name="MessageList" 
        component={MessagesScreen}
        options={{ title: 'Messages' }}
      />
      <MessageStack.Screen 
        name="Chat" 
        component={ConversationDetailScreen}
        options={({ route }) => ({
          title: route.params.participantName || 'Chat'
        })}
      />
    </MessageStack.Navigator>
  )
}

// Team Stack Navigator
const TeamNavigator = () => {
  const { theme } = useTheme()
  
  return (
    <TeamStack.Navigator
      initialRouteName="TeamList"
      screenOptions={{
        headerShown: true,
        animation: 'slide_from_right',
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          color: theme.colors.onSurface,
          fontWeight: '600',
        },
      }}
    >
      <TeamStack.Screen 
        name="TeamList" 
        component={TeamManagementScreen}
        options={{ title: 'Team Management' }}
      />
      <TeamStack.Screen 
        name="AddTeamMember" 
        component={AddTeamMemberScreen}
        options={{ title: 'Add Team Member' }}
      />
    </TeamStack.Navigator>
  )
}

// Profile Stack Navigator
const ProfileNavigator = () => {
  const { theme } = useTheme()
  
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: true,
        animation: 'slide_from_right',
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          color: theme.colors.onSurface,
          fontWeight: '600',
        },
      }}
    >
      <ProfileStack.Screen 
        name="ProfileMain" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </ProfileStack.Navigator>
  )
}

// Main Stack Navigator with Fixed Sidebar
const MainNavigator = () => {
  const { theme } = useTheme()
  
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <MainStack.Screen name="Dashboard" component={DashboardScreenWrapper} />
      <MainStack.Screen name="Clients">
        {(props) => (
          <FixedSidebarLayout {...props}>
            <ClientNavigator />
          </FixedSidebarLayout>
        )}
      </MainStack.Screen>
      <MainStack.Screen name="Tasks">
        {(props) => (
          <FixedSidebarLayout {...props}>
            <TaskNavigator />
          </FixedSidebarLayout>
        )}
      </MainStack.Screen>
      <MainStack.Screen name="Messages">
        {(props) => (
          <FixedSidebarLayout {...props}>
            <MessageNavigator />
          </FixedSidebarLayout>
        )}
      </MainStack.Screen>
      <MainStack.Screen name="Team">
        {(props) => (
          <FixedSidebarLayout {...props}>
            <TeamNavigator />
          </FixedSidebarLayout>
        )}
      </MainStack.Screen>
      <MainStack.Screen name="Profile">
        {(props) => (
          <FixedSidebarLayout {...props}>
            <ProfileNavigator />
          </FixedSidebarLayout>
        )}
      </MainStack.Screen>
      <MainStack.Screen name="Settings">
        {(props) => (
          <FixedSidebarLayout {...props}>
            <SettingsScreen />
          </FixedSidebarLayout>
        )}
      </MainStack.Screen>
      <MainStack.Screen name="Help">
        {(props) => (
          <FixedSidebarLayout {...props}>
            <HelpScreen />
          </FixedSidebarLayout>
        )}
      </MainStack.Screen>
    </MainStack.Navigator>
  )
}

// Root Navigator
const RootNavigator = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Loading" component={LoadingScreen} />
      </RootStack.Navigator>
    )
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <RootStack.Screen name="Main" component={MainNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  )
}

// Main App Navigator
export const AppNavigator = () => {
  return <RootNavigator />
}

export default AppNavigator