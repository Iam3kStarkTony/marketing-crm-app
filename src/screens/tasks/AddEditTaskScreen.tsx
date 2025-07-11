import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import {
  Text,
  TextInput,
  Button,
  Card,
  HelperText,
  SegmentedButtons,
  Menu,
  Divider,
  Chip,
  Switch,
} from 'react-native-paper'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRoute } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { Task, TaskFormData, Client, Profile } from '../../types/database'
import { useAuth } from '../../contexts/AuthContext'
import CrossPlatformDatePicker from '../../components/CrossPlatformDatePicker'
import { N8nIntegrationService } from '../../services/n8nIntegration'

// Validation schema
const taskSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  due_date: z.date().optional(),
  client_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  assignment_type: z.enum(['agent', 'client', 'todo']),
})

type TaskFormDataType = z.infer<typeof taskSchema>

interface AddEditTaskScreenProps {
  navigation: any
}

const AddEditTaskScreen: React.FC<AddEditTaskScreenProps> = ({ navigation }) => {
  const route = useRoute()
  const { taskId, clientId } = (route.params as { taskId?: string; clientId?: string }) || {}
  const isEditing = !!taskId
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEditing)
  const [clients, setClients] = useState<Client[]>([])
  const [agents, setAgents] = useState<Profile[]>([])
  const [clientMenuVisible, setClientMenuVisible] = useState(false)
  const [agentMenuVisible, setAgentMenuVisible] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Profile | null>(null)
  const [sendToClient, setSendToClient] = useState(false)
  const [assignmentType, setAssignmentType] = useState<'agent' | 'client' | 'todo'>('todo')
  const hasManuallyChangedAssignment = useRef(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<TaskFormDataType>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      due_date: undefined,
      client_id: clientId || undefined,
      assigned_to: undefined,
      assignment_type: 'todo',
    },
  })

  const watchedClientId = watch('client_id')
  const watchedAssignedTo = watch('assigned_to')
  const watchedDueDate = watch('due_date')

  useEffect(() => {
    fetchClients()
    fetchAgents()
    if (isEditing) {
      fetchTask()
    } else if (clientId) {
      // Pre-select client if passed from navigation
      setValue('client_id', clientId)
    }
  }, [taskId, clientId])

  useEffect(() => {
    if (watchedClientId && clients.length > 0) {
      const client = clients.find(c => c.id === watchedClientId)
      setSelectedClient(client || null)
    }
  }, [watchedClientId, clients])

  useEffect(() => {
    if (watchedAssignedTo && agents.length > 0) {
      const agent = agents.find(a => a.id === watchedAssignedTo)
      setSelectedAgent(agent || null)
    }
  }, [watchedAssignedTo, agents])

  // Only set assignment type automatically when editing existing tasks and no manual changes have been made
  useEffect(() => {
    if (isEditing && !hasManuallyChangedAssignment.current) {
      if (watchedClientId && !watchedAssignedTo) {
        setAssignmentType('client')
      } else if (watchedAssignedTo && watchedAssignedTo !== user?.id) {
        setAssignmentType('agent')
      } else {
        setAssignmentType('todo')
      }
    }
  }, [watchedAssignedTo, watchedClientId, user?.id, isEditing])

  const fetchClients = async () => {
    try {
      console.log('Fetching clients...')
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, company')
        .eq('status', 'active')
        .order('full_name')

      if (error) {
        console.error('Error fetching clients:', error)
        return
      }

      console.log('Fetched clients:', data)
      setClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const fetchAgents = async () => {
    try {
      console.log('Fetching agents...')
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('role', ['admin', 'manager', 'agent'])
        .eq('is_active', true)
        .order('full_name')

      if (error) {
        console.error('Error fetching agents:', error)
        return
      }

      console.log('Fetched agents:', data)
      setAgents(data || [])
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const fetchTask = async () => {
    if (!taskId) return

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (error) {
        console.error('Error fetching task:', error)
        Alert.alert('Error', 'Failed to load task details.')
        navigation.goBack()
        return
      }

      // Set assignment type from database or determine from existing data
      const dbAssignmentType = data.assignment_type || 
        (data.client_id && !data.assigned_to ? 'client' :
         data.assigned_to && data.assigned_to !== user?.id ? 'agent' : 'todo')
      
      setAssignmentType(dbAssignmentType)
      
      reset({
        title: data.title,
        description: data.description || '',
        status: data.status,
        priority: data.priority,
        due_date: data.due_date ? new Date(data.due_date) : undefined,
        client_id: data.client_id || undefined,
        assigned_to: data.assigned_to || undefined,
        assignment_type: dbAssignmentType,
      })
    } catch (error) {
      console.error('Error fetching task:', error)
      Alert.alert('Error', 'An unexpected error occurred.')
      navigation.goBack()
    } finally {
      setInitialLoading(false)
    }
  }

  const onSubmit = async (data: TaskFormDataType) => {
    setLoading(true)
    try {
      // Validate assignment type requirements
      if (assignmentType === 'client' && !data.client_id) {
        Alert.alert('Validation Error', 'Please select a client when assigning a task to a client.')
        setLoading(false)
        return
      }
      
      if (assignmentType === 'agent' && !data.assigned_to) {
        Alert.alert('Validation Error', 'Please select an agent when assigning a task to an agent.')
        setLoading(false)
        return
      }

      // Use form data directly - client_id and assigned_to are now independent
      const taskData = {
        ...data,
        due_date: data.due_date ? data.due_date.toISOString() : null,
        assigned_to: data.assigned_to || null,
        client_id: data.client_id || null,
        assignment_type: assignmentType,
      }

      if (isEditing) {
        // Update existing task via n8n workflow
        if (!user) {
          Alert.alert('Error', 'User not authenticated')
          return
        }

        try {
          const updateTaskPayload = {
            action: 'update',
            task_id: taskId,
            title: data.title,
            description: data.description,
            status: data.status,
            priority: data.priority,
            due_date: data.due_date ? data.due_date.toISOString() : null,
            client_id: data.client_id || null,
            assigned_to: data.assigned_to || null,
            updated_by: user.id,
            send_to_client: data.client_id && sendToClient,
            assignment_type: assignmentType,
          }

          const result = await N8nIntegrationService.callN8nWorkflow('task-management', updateTaskPayload)
          
          Alert.alert(
            'Success',
            'Task updated successfully!',
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ]
          )
        } catch (error: any) {
          console.error('Error updating task via n8n:', error)
          Alert.alert(
            'Update Failed',
            error.message || 'Failed to update task. Please try again.',
            [{ text: 'OK' }]
          )
          return
        }
      } else {
        // Create new task via n8n workflow
        if (!user) {
          Alert.alert('Error', 'User not authenticated')
          return
        }

        try {
          const taskPayload = {
            action: 'create',
            title: data.title,
            description: data.description,
            status: data.status,
            priority: data.priority,
            due_date: data.due_date ? data.due_date.toISOString() : null,
            client_id: data.client_id || null,
            assigned_to: data.assigned_to || null,
            created_by: user.id,
            send_to_client: data.client_id && sendToClient,
            assignment_type: assignmentType,
          }

          const result = await N8nIntegrationService.callN8nWorkflow('task-management', taskPayload)
          
          Alert.alert(
            'Success',
            'Task created successfully!',
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ]
          )
        } catch (error: any) {
          console.error('Error creating task via n8n:', error)
          Alert.alert(
            'Creation Failed',
            error.message || 'Failed to create task. Please try again.',
            [{ text: 'OK' }]
          )
          return
        }
      }
    } catch (error) {
      console.error('Error saving task:', error)
      Alert.alert(
        'Save Failed',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      )
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigation.goBack()
  }

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'web') {
      // For web platform, selectedDate is passed directly
      if (selectedDate) {
        setValue('due_date', selectedDate)
      }
    } else {
      // For mobile platforms, hide the picker and set the date
      setShowDatePicker(false)
      if (selectedDate) {
        setValue('due_date', selectedDate)
      }
    }
  }

  const showDatePickerModal = () => {
    setShowDatePicker(true)
  }

  const clearDueDate = () => {
    setValue('due_date', undefined)
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

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading task details...</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.formCard}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              {isEditing ? 'Edit Task' : 'Add New Task'}
            </Text>

            <View style={styles.form}>
              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Task Title *"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      mode="outlined"
                      error={!!errors.title}
                      disabled={loading}
                      left={<TextInput.Icon icon="clipboard-text" />}
                    />
                    <HelperText type="error" visible={!!errors.title}>
                      {errors.title?.message}
                    </HelperText>
                  </View>
                )}
              />

              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Description"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      mode="outlined"
                      multiline
                      numberOfLines={4}
                      disabled={loading}
                      left={<TextInput.Icon icon="text" />}
                    />
                  </View>
                )}
              />

              <Controller
                control={control}
                name="status"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.inputContainer}>
                    <Text variant="bodyLarge" style={styles.fieldLabel}>
                      Status *
                    </Text>
                    <SegmentedButtons
                      value={value}
                      onValueChange={onChange}
                      buttons={[
                        {
                          value: 'pending',
                          label: 'Pending',
                          icon: 'clock-outline',
                        },
                        {
                          value: 'in_progress',
                          label: 'In Progress',
                          icon: 'play-circle-outline',
                        },
                        {
                          value: 'completed',
                          label: 'Completed',
                          icon: 'check-circle-outline',
                        },
                        {
                          value: 'cancelled',
                          label: 'Cancelled',
                          icon: 'close-circle-outline',
                        },
                      ]}
                      disabled={loading}
                    />
                  </View>
                )}
              />

              <Controller
                control={control}
                name="priority"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.inputContainer}>
                    <Text variant="bodyLarge" style={styles.fieldLabel}>
                      Priority *
                    </Text>
                    <SegmentedButtons
                      value={value}
                      onValueChange={onChange}
                      buttons={[
                        {
                          value: 'low',
                          label: 'Low',
                          icon: 'arrow-down',
                        },
                        {
                          value: 'medium',
                          label: 'Medium',
                          icon: 'minus',
                        },
                        {
                          value: 'high',
                          label: 'High',
                          icon: 'arrow-up',
                        },
                        {
                          value: 'urgent',
                          label: 'Urgent',
                          icon: 'alert',
                        },
                      ]}
                      disabled={loading}
                    />
                  </View>
                )}
              />

              <View style={styles.inputContainer}>
                <Text variant="bodyLarge" style={styles.fieldLabel}>
                  Due Date
                </Text>
                <View style={styles.dateContainer}>
                  {Platform.OS === 'web' ? (
                    <CrossPlatformDatePicker
                      value={watchedDueDate}
                      mode="date"
                      display="default"
                      onChange={handleDateChange}
                      minimumDate={new Date()}
                      label="Due Date"
                      disabled={loading}
                    />
                  ) : (
                    <>
                      <Button
                        mode="outlined"
                        onPress={showDatePickerModal}
                        icon="calendar"
                        disabled={loading}
                        style={styles.dateButton}
                      >
                        {watchedDueDate
                          ? watchedDueDate.toLocaleDateString()
                          : 'Select Due Date'
                        }
                      </Button>
                      {showDatePicker && (
                        <CrossPlatformDatePicker
                          value={watchedDueDate}
                          mode="date"
                          display="default"
                          onChange={handleDateChange}
                          minimumDate={new Date()}
                          label="Due Date"
                        />
                      )}
                    </>
                  )}
                  {watchedDueDate && (
                    <Button
                      mode="text"
                      onPress={clearDueDate}
                      disabled={loading}
                      compact
                    >
                      Clear
                    </Button>
                  )}
                </View>
              </View>



              <View style={styles.inputContainer}>
                <Text variant="bodyLarge" style={styles.fieldLabel}>
                  Client (Optional)
                </Text>
                <Menu
                  visible={clientMenuVisible}
                  onDismiss={() => setClientMenuVisible(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setClientMenuVisible(true)}
                      icon="account"
                      disabled={loading}
                      style={styles.clientButton}
                    >
                      {selectedClient
                        ? `${selectedClient.full_name}${selectedClient.company ? ` (${selectedClient.company})` : ''}`
                        : 'No Client Selected (General Task)'
                      }
                    </Button>
                  }
                >
                  <Menu.Item
                    onPress={() => {
                      hasManuallyChangedAssignment.current = true
                      setValue('client_id', undefined)
                      setClientMenuVisible(false)
                    }}
                    title="No Client (General Task)"
                    titleStyle={{
                      fontWeight: !watchedClientId ? 'bold' : 'normal'
                    }}
                    leadingIcon={!watchedClientId ? 'check' : 'close'}
                  />
                  {clients.map((client) => (
                    <Menu.Item
                      key={client.id}
                      onPress={() => {
                        hasManuallyChangedAssignment.current = true
                        setValue('client_id', client.id)
                        setClientMenuVisible(false)
                      }}
                      title={`${client.full_name}${client.company ? ` (${client.company})` : ''}`}
                      titleStyle={{
                        fontWeight: client.id === watchedClientId ? 'bold' : 'normal'
                      }}
                      leadingIcon={client.id === watchedClientId ? 'check' : 'account'}
                    />
                  ))}
                </Menu>
                <HelperText type="info" visible={true}>
                  Optionally associate this task with a specific client
                </HelperText>
              </View>

              <View style={styles.inputContainer}>
                <Text variant="bodyLarge" style={styles.fieldLabel}>
                  Assignment Type
                </Text>
                <View style={styles.toggleContainer}>
                  <Button
                    mode={assignmentType === 'todo' ? 'contained' : 'outlined'}
                    onPress={() => {
                      hasManuallyChangedAssignment.current = true
                      setAssignmentType('todo')
                      setValue('assigned_to', user?.id)
                    }}
                    style={[styles.toggleButton, assignmentType === 'todo' && styles.activeToggle]}
                    compact
                  >
                    Todo
                  </Button>
                  <Button
                    mode={assignmentType === 'agent' ? 'contained' : 'outlined'}
                    onPress={() => {
                      hasManuallyChangedAssignment.current = true
                      setAssignmentType('agent')
                      setValue('assigned_to', undefined)
                    }}
                    style={[styles.toggleButton, assignmentType === 'agent' && styles.activeToggle]}
                    compact
                  >
                    Agent
                  </Button>
                  <Button
                    mode={assignmentType === 'client' ? 'contained' : 'outlined'}
                    onPress={() => {
                      hasManuallyChangedAssignment.current = true
                      setAssignmentType('client')
                      setValue('assigned_to', undefined)
                    }}
                    style={[styles.toggleButton, assignmentType === 'client' && styles.activeToggle]}
                    compact
                  >
                    Client
                  </Button>
                </View>
                <HelperText type="info" visible={true}>
                  {assignmentType === 'todo' ? 'Task will be added to your personal to-do list' :
                   assignmentType === 'agent' ? 'Assign task to another team member' :
                   'Assign task to a specific client'}
                </HelperText>
              </View>

              {assignmentType === 'agent' && (
                <View style={styles.inputContainer}>
                  <Text variant="bodyLarge" style={styles.fieldLabel}>
                    Select Agent
                  </Text>
                  <Menu
                    visible={agentMenuVisible}
                    onDismiss={() => setAgentMenuVisible(false)}
                    anchor={
                      <Button
                        mode="outlined"
                        onPress={() => {
                          console.log('Agent button clicked!');
                          console.log('Current agents array:', agents);
                          console.log('Agents length:', agents.length);
                          console.log('Current user:', user);
                          console.log('Setting agentMenuVisible to true');
                          setAgentMenuVisible(true);
                        }}
                        icon="account-tie"
                        disabled={loading}
                        style={styles.clientButton}
                      >
                        {selectedAgent
                          ? `${selectedAgent.full_name} (${selectedAgent.role})`
                          : agents.length > 0 ? 'Select Agent' : 'No Agents Available'
                        }
                      </Button>
                    }
                  >
                    {(() => {
                      const filteredAgents = agents.filter(agent => agent.id !== user?.id);
                      console.log('Filtered agents (excluding current user):', filteredAgents);
                      console.log('Current user ID:', user?.id);
                      return filteredAgents.map((agent) => (
                      <Menu.Item
                        key={agent.id}
                        onPress={() => {
                          hasManuallyChangedAssignment.current = true
                          setValue('assigned_to', agent.id)
                          setAgentMenuVisible(false)
                        }}
                        title={`${agent.full_name} (${agent.role})`}
                        titleStyle={{
                          fontWeight: agent.id === watchedAssignedTo ? 'bold' : 'normal'
                        }}
                        leadingIcon={agent.id === watchedAssignedTo ? 'check' : 'account-tie'}
                      />
                    ));
                    })()}
                  </Menu>
                  <HelperText type="info" visible={true}>
                    Select which team member should handle this task
                  </HelperText>
                </View>
              )}

              {assignmentType === 'client' && (
                <View style={styles.inputContainer}>
                  <HelperText type="info" visible={true}>
                    This task will be assigned directly to the selected client above. The client will receive notifications and can interact with this task.
                  </HelperText>
                </View>
              )}

              {selectedClient && (
                <View style={styles.inputContainer}>
                  <View style={styles.switchContainer}>
                    <Text variant="bodyMedium" style={styles.switchLabel}>
                      Send task notification to client
                    </Text>
                    <Switch
                      value={sendToClient}
                      onValueChange={setSendToClient}
                      disabled={loading}
                    />
                  </View>
                  <HelperText type="info" visible={sendToClient}>
                    The client will receive an email notification about this task
                  </HelperText>
                </View>
              )}

              <View style={styles.inputContainer}>
                <Text variant="bodyLarge" style={styles.fieldLabel}>
                  Task Summary
                </Text>
                <View style={styles.summaryContainer}>
                  <Chip 
                    icon={
                      assignmentType === 'todo'
                        ? 'account-circle'
                        : assignmentType === 'agent'
                        ? 'account-tie'
                        : 'account-group'
                    } 
                    mode="outlined" 
                    style={styles.summaryChip}
                  >
                    {assignmentType === 'todo'
                      ? 'Personal To-Do'
                      : assignmentType === 'agent'
                      ? (selectedAgent ? `Agent: ${selectedAgent.full_name}` : 'Agent: Not Selected')
                      : `Client Task: ${selectedClient ? selectedClient.full_name : 'Select Client Required'}`
                    }
                  </Chip>
                  {selectedClient && assignmentType !== 'client' && (
                    <Chip 
                      icon="account" 
                      mode="outlined" 
                      style={styles.summaryChip}
                    >
                      Client: {selectedClient.full_name}
                    </Chip>
                  )}
                </View>
                <HelperText type="info" visible={true}>
                  {assignmentType === 'todo'
                    ? selectedClient
                      ? 'This task will be assigned to you and associated with the selected client'
                      : 'This task will appear in your personal to-do list'
                    : assignmentType === 'agent'
                    ? selectedClient
                      ? 'This task will be assigned to the selected team member and associated with the selected client'
                      : 'This task will be assigned to the selected team member'
                    : 'This task will be assigned directly to the client - they will receive notifications and can submit responses'}
                </HelperText>
              </View>

              <View style={styles.buttonRow}>
                <Button
                  mode="outlined"
                  onPress={handleCancel}
                  disabled={loading}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSubmit(onSubmit)}
                  loading={loading}
                  disabled={loading}
                  style={styles.saveButton}
                >
                  {isEditing ? 'Update Task' : 'Create Task'}
                </Button>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
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
  },
  formCard: {
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 8,
  },
  fieldLabel: {
    marginBottom: 8,
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  toggleButton: {
    flex: 1,
  },
  activeToggle: {
    elevation: 2,
  },
  clientButton: {
    justifyContent: 'flex-start',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButton: {
    flex: 1,
  },
  clientButton: {
    justifyContent: 'flex-start',
  },
  personalChip: {
    alignSelf: 'flex-start',
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  summaryChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
})

export default AddEditTaskScreen