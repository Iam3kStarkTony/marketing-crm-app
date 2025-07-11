import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native'
import {
  Text,
  Card,
  Button,
  Chip,
  IconButton,
  Divider,
  ActivityIndicator,
} from 'react-native-paper'
import { useRoute, useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { Task, Client } from '../../types/database'
import { useAuth } from '../../contexts/AuthContext'
import TaskChatDrawer from '../../components/TaskChatDrawer'
import TaskActionButtons from '../../components/TaskActionButtons'
import TaskFileUpload from '../../components/TaskFileUpload'

interface TaskDetailScreenProps {
  navigation: any
}

const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({ navigation }) => {
  const route = useRoute()
  const { taskId } = route.params as { taskId: string }
  const { user } = useAuth()
  
  const [task, setTask] = useState<Task | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [chatVisible, setChatVisible] = useState(false)
  const [fileUploadVisible, setFileUploadVisible] = useState(false)

  useFocusEffect(
    React.useCallback(() => {
      fetchTaskDetails()
    }, [taskId])
  )

  const fetchTaskDetails = async () => {
    setLoading(true)
    try {
      // Fetch task details
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (taskError) {
        console.error('Error fetching task:', taskError)
        Alert.alert('Error', 'Failed to load task details.')
        navigation.goBack()
        return
      }

      setTask(taskData)

      // Fetch client details if task has a client
      if (taskData.client_id) {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', taskData.client_id)
          .single()

        if (clientError) {
          console.error('Error fetching client:', clientError)
        } else {
          setClient(clientData)
        }
      } else {
        setClient(null)
      }
    } catch (error) {
      console.error('Error fetching task details:', error)
      Alert.alert('Error', 'An unexpected error occurred.')
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (newStatus: string) => {
    if (!task) return
    setTask({ ...task, status: newStatus as any })
  }

  const handleChatOpen = () => {
    setChatVisible(true)
  }

  const handleFileUpload = () => {
    setFileUploadVisible(true)
  }

  const getUserRole = () => {
    // This should be retrieved from user context or profile
    // For now, returning a default role
    return user?.user_metadata?.role || 'user'
  }

  const handleEditTask = () => {
    navigation.navigate('AddEditTask', { taskId: task?.id })
  }

  const handleDeleteTask = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: deleteTask,
        },
      ]
    )
  }

  const deleteTask = async () => {
    if (!task) return

    setUpdating(true)
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id)

      if (error) {
        console.error('Error deleting task:', error)
        Alert.alert('Error', 'Failed to delete task.')
        return
      }

      Alert.alert(
        'Success',
        'Task deleted successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      )
    } catch (error) {
      console.error('Error deleting task:', error)
      Alert.alert('Error', 'An unexpected error occurred.')
    } finally {
      setUpdating(false)
    }
  }

  const handleContactClient = () => {
    if (!client) return

    Alert.alert(
      'Contact Client',
      `How would you like to contact ${client.full_name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Call',
          onPress: () => {
            if (client.phone) {
              Linking.openURL(`tel:${client.phone}`)
            } else {
              Alert.alert('No Phone', 'No phone number available for this client.')
            }
          },
        },
        {
          text: 'Email',
          onPress: () => {
            Linking.openURL(`mailto:${client.email}`)
          },
        },
        {
          text: 'Message',
          onPress: () => {
            navigation.navigate('Messages', {
              screen: 'ConversationDetail',
              params: { clientId: client.id },
            })
          },
        },
      ]
    )
  }

  const handleViewClient = () => {
    if (!client) return
    navigation.navigate('Clients', {
      screen: 'ClientDetail',
      params: { clientId: client.id },
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#FF3B30'
      case 'high': return '#FF9500'
      case 'medium': return '#007AFF'
      case 'low': return '#34C759'
      default: return '#007AFF'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#34C759'
      case 'in_progress': return '#007AFF'
      case 'cancelled': return '#FF3B30'
      case 'pending': return '#FF9500'
      default: return '#007AFF'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isOverdue = (dueDateString: string) => {
    return new Date(dueDateString) < new Date() && task?.status !== 'completed'
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading task details...</Text>
      </View>
    )
  }

  if (!task) {
    return (
      <View style={styles.errorContainer}>
        <Text>Task not found.</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={styles.headerInfo}>
              <Text variant="headlineSmall" style={styles.title}>
                {task.title}
              </Text>
              <View style={styles.chipRow}>
                <Chip
                  icon="flag"
                  style={[styles.chip, { backgroundColor: getPriorityColor(task.priority) + '20' }]}
                  textStyle={{ color: getPriorityColor(task.priority) }}
                >
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </Chip>
                <Chip
                  icon="circle"
                  style={[styles.chip, { backgroundColor: getStatusColor(task.status) + '20' }]}
                  textStyle={{ color: getStatusColor(task.status) }}
                >
                  {task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.replace('_', ' ').slice(1)}
                </Chip>
              </View>
            </View>
            <View style={styles.headerActions}>
              <IconButton
                icon="pencil"
                mode="contained-tonal"
                onPress={handleEditTask}
                disabled={updating}
              />
              <IconButton
                icon="delete"
                mode="contained-tonal"
                iconColor="#FF3B30"
                onPress={handleDeleteTask}
                disabled={updating}
              />
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Task Details Card */}
      <Card style={styles.detailCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Task Details
          </Text>
          
          {task.description && (
            <View style={styles.detailRow}>
              <Text variant="bodyMedium" style={styles.label}>
                Description:
              </Text>
              <Text variant="bodyMedium" style={styles.value}>
                {task.description}
              </Text>
            </View>
          )}

          {task.due_date && (
            <View style={styles.detailRow}>
              <Text variant="bodyMedium" style={styles.label}>
                Due Date:
              </Text>
              <Text
                variant="bodyMedium"
                style={[
                  styles.value,
                  isOverdue(task.due_date) && styles.overdueText,
                ]}
              >
                {formatDate(task.due_date)}
                {isOverdue(task.due_date) && ' (Overdue)'}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text variant="bodyMedium" style={styles.label}>
              Created:
            </Text>
            <Text variant="bodyMedium" style={styles.value}>
              {formatDateTime(task.created_at)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text variant="bodyMedium" style={styles.label}>
              Last Updated:
            </Text>
            <Text variant="bodyMedium" style={styles.value}>
              {formatDateTime(task.updated_at)}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Client Information Card */}
      {client && (
        <Card style={styles.clientCard}>
          <Card.Content>
            <View style={styles.clientHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Client Information
              </Text>
              <Button
                mode="text"
                onPress={handleViewClient}
                compact
              >
                View Details
              </Button>
            </View>
            
            <View style={styles.clientInfo}>
              <Text variant="bodyLarge" style={styles.clientName}>
                {client.full_name}
              </Text>
              {client.company && (
                <Text variant="bodyMedium" style={styles.clientCompany}>
                  {client.company}
                </Text>
              )}
              <Text variant="bodyMedium" style={styles.clientEmail}>
                {client.email}
              </Text>
              {client.phone && (
                <Text variant="bodyMedium" style={styles.clientPhone}>
                  {client.phone}
                </Text>
              )}
            </View>

            <Button
              mode="outlined"
              onPress={handleContactClient}
              icon="phone"
              style={styles.contactButton}
            >
              Contact Client
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Task Actions */}
      <TaskActionButtons
        taskId={taskId}
        currentStatus={task.status}
        userRole={getUserRole()}
        onStatusChange={handleStatusChange}
        onChatOpen={handleChatOpen}
        onFileUpload={handleFileUpload}
      />

      {/* Chat Drawer */}
      <TaskChatDrawer
        visible={chatVisible}
        onDismiss={() => setChatVisible(false)}
        taskId={taskId}
      />

      {/* File Upload Modal */}
      <TaskFileUpload
        visible={fileUploadVisible}
        onDismiss={() => setFileUploadVisible(false)}
        taskId={taskId}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
    marginRight: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    marginBottom: 4,
  },
  detailCard: {
    marginBottom: 16,
    elevation: 2,
  },
  clientCard: {
    marginBottom: 16,
    elevation: 2,
  },
  actionsCard: {
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  detailRow: {
    marginBottom: 12,
  },
  label: {
    fontWeight: '500',
    marginBottom: 4,
    color: '#666',
  },
  value: {
    fontSize: 16,
  },
  overdueText: {
    color: '#FF3B30',
    fontWeight: '500',
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientInfo: {
    marginBottom: 16,
  },
  clientName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  clientCompany: {
    color: '#666',
    marginBottom: 4,
  },
  clientEmail: {
    marginBottom: 4,
  },
  clientPhone: {
    marginBottom: 4,
  },
  contactButton: {
    marginTop: 8,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
})

export default TaskDetailScreen