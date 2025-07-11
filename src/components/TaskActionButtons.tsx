import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  Alert,
} from 'react-native'
import {
  Button,
  Menu,
  useTheme,
  IconButton,
} from 'react-native-paper'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'

interface TaskActionButtonsProps {
  taskId: string
  currentStatus: string
  userRole: string
  onStatusChange: (newStatus: string) => void
  onChatOpen: () => void
  onFileUpload: () => void
}

const TaskActionButtons: React.FC<TaskActionButtonsProps> = ({
  taskId,
  currentStatus,
  userRole,
  onStatusChange,
  onChatOpen,
  onFileUpload,
}) => {
  const theme = useTheme()
  const { user } = useAuth()
  const styles = createStyles(theme)
  
  const [statusMenuVisible, setStatusMenuVisible] = useState(false)
  const [updating, setUpdating] = useState(false)

  const getAvailableStatusTransitions = () => {
    const transitions: { [key: string]: string[] } = {
      'pending': ['in_progress', 'cancelled'],
      'in_progress': ['submitted_for_review', 'pending', 'cancelled'],
      'submitted_for_review': ['needs_revision', 'completed', 'in_progress'],
      'needs_revision': ['in_progress', 'cancelled'],
      'completed': [], // No transitions from completed
      'cancelled': ['pending'], // Can reopen cancelled tasks
    }

    // Filter based on user role
    let availableTransitions = transitions[currentStatus] || []
    
    if (userRole !== 'admin' && userRole !== 'manager') {
      // Regular users can't mark tasks as completed directly
      availableTransitions = availableTransitions.filter(status => 
        status !== 'completed' && status !== 'needs_revision'
      )
    }

    return availableTransitions
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'pending': 'Mark as Pending',
      'in_progress': 'Start Working',
      'submitted_for_review': 'Submit for Review',
      'needs_revision': 'Needs Revision',
      'completed': 'Mark as Completed',
      'cancelled': 'Cancel Task',
    }
    return labels[status] || status
  }

  const getStatusIcon = (status: string) => {
    const icons: { [key: string]: string } = {
      'pending': 'clock-outline',
      'in_progress': 'play-circle-outline',
      'submitted_for_review': 'check-circle-outline',
      'needs_revision': 'alert-circle-outline',
      'completed': 'check-all',
      'cancelled': 'close-circle-outline',
    }
    return icons[status] || 'circle-outline'
  }

  const updateTaskStatus = async (newStatus: string, reason?: string) => {
    setUpdating(true)
    try {
      // Update task status
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(newStatus === 'completed' && { task_accepted_date: new Date().toISOString() }),
        })
        .eq('id', taskId)

      if (taskError) {
        console.error('Error updating task status:', taskError)
        Alert.alert('Error', 'Failed to update task status')
        return
      }

      // Insert status history record
      const { error: historyError } = await supabase
        .from('task_status_history')
        .insert({
          task_id: taskId,
          old_status: currentStatus,
          new_status: newStatus,
          changed_by: user?.id,
          reason: reason || null,
        })

      if (historyError) {
        console.error('Error inserting status history:', historyError)
        // Don't show error to user as the main update succeeded
      }

      // Insert system message
      const { error: messageError } = await supabase
        .from('task_messages')
        .insert({
          task_id: taskId,
          user_id: user?.id,
          message: `Task status changed from "${currentStatus.replace('_', ' ')}" to "${newStatus.replace('_', ' ')}"${reason ? ` - ${reason}` : ''}`,
          message_type: 'system',
        })

      if (messageError) {
        console.error('Error inserting system message:', messageError)
        // Don't show error to user as the main update succeeded
      }

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: user?.id, // This should be the assigned user, but for now using current user
          type: 'task_status_changed',
          title: 'Task Status Updated',
          message: `Task status changed to "${newStatus.replace('_', ' ')}"`,
          data: {
            task_id: taskId,
            old_status: currentStatus,
            new_status: newStatus,
          },
        })

      if (notificationError) {
        console.error('Error creating notification:', notificationError)
        // Don't show error to user as the main update succeeded
      }

      onStatusChange(newStatus)
      Alert.alert('Success', 'Task status updated successfully!')
    } catch (error) {
      console.error('Error updating task status:', error)
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setUpdating(false)
      setStatusMenuVisible(false)
    }
  }

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'needs_revision') {
      Alert.prompt(
        'Revision Required',
        'Please provide a reason for requesting revision:',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Submit',
            onPress: (reason) => {
              if (reason?.trim()) {
                updateTaskStatus(newStatus, reason.trim())
              } else {
                Alert.alert('Error', 'Please provide a reason for revision')
              }
            },
          },
        ],
        'plain-text'
      )
    } else if (newStatus === 'cancelled') {
      Alert.alert(
        'Cancel Task',
        'Are you sure you want to cancel this task?',
        [
          {
            text: 'No',
            style: 'cancel',
          },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: () => updateTaskStatus(newStatus),
          },
        ]
      )
    } else {
      updateTaskStatus(newStatus)
    }
  }

  const availableTransitions = getAvailableStatusTransitions()

  return (
    <View style={styles.container}>
      <View style={styles.actionRow}>
        <IconButton
          icon="chat-outline"
          mode="contained-tonal"
          onPress={onChatOpen}
          style={styles.actionButton}
        />
        
        <IconButton
          icon="paperclip"
          mode="contained-tonal"
          onPress={onFileUpload}
          style={styles.actionButton}
        />
        
        {availableTransitions.length > 0 && (
          <Menu
            visible={statusMenuVisible}
            onDismiss={() => setStatusMenuVisible(false)}
            anchor={
              <Button
                mode="contained"
                onPress={() => setStatusMenuVisible(true)}
                disabled={updating}
                loading={updating}
                icon="swap-horizontal"
                style={styles.statusButton}
              >
                Change Status
              </Button>
            }
          >
            {availableTransitions.map((status) => (
              <Menu.Item
                key={status}
                onPress={() => handleStatusChange(status)}
                title={getStatusLabel(status)}
                leadingIcon={getStatusIcon(status)}
              />
            ))}
          </Menu>
        )}
      </View>
    </View>
  )
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    marginRight: 8,
  },
  statusButton: {
    flex: 1,
  },
})

export default TaskActionButtons