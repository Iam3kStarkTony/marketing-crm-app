import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Animated,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native'
import {
  Text,
  Card,
  Button,
  Searchbar,
  FAB,
  Chip,
  ActivityIndicator,
  Menu,
  Badge,
  useTheme,
  Avatar,
  Surface,
} from 'react-native-paper'
import { useFocusEffect } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../../services/supabase'
import { Task, TaskFilter, SortOption } from '../../types/database'
import { spacing } from '../../config/theme'
import taskChatService, { TaskMessage, TaskChatSubscription } from '../../services/taskChatService'

interface TasksScreenProps {
  navigation: any
}

const TasksScreen: React.FC<TasksScreenProps> = ({ navigation }) => {
  const theme = useTheme()
  const styles = createStyles(theme)
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('due_date')
  const [menuVisible, setMenuVisible] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [panelAnimation] = useState(new Animated.Value(0))
  const [isTaskExpanded, setIsTaskExpanded] = useState(false)
  const [messages, setMessages] = useState<TaskMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [chatSubscription, setChatSubscription] = useState<TaskChatSubscription | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const messagesScrollViewRef = useRef<ScrollView>(null)

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          client:clients(full_name),
          assigned_user:profiles!tasks_assigned_to_profiles_fkey(full_name)
        `)
        .order(sortBy === 'due_date' ? 'due_date' : 'created_at', {
          ascending: sortBy === 'due_date',
        })

      if (error) {
        console.error('Error fetching tasks:', error)
        Alert.alert('Error', `Failed to load tasks: ${error.message || error}`)
        return
      }

      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
      Alert.alert('Error', `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const applyFiltersAndSearch = useCallback(() => {
    let filtered = [...tasks]

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(task => task.status === filter)
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.client?.full_name.toLowerCase().includes(query)
      )
    }

    setFilteredTasks(filtered)
  }, [tasks, filter, searchQuery])

  useFocusEffect(
    useCallback(() => {
      loadTasks()
      loadUnreadCounts()
    }, [])
  )

  // Auto-select task with newest conversation after tasks are loaded
  useEffect(() => {
    const autoSelectNewestTask = async () => {
      if (tasks.length > 0 && !selectedTask) {
        try {
          const taskIds = tasks.map(task => task.id)
          const tasksWithActivity = await taskChatService.getTasksWithLatestActivity(taskIds)
          
          // Find the task with the most recent activity
          const newestTask = tasksWithActivity.find(item => item.latestActivity !== null)
          if (newestTask) {
            const taskToSelect = tasks.find(task => task.id === newestTask.taskId)
            if (taskToSelect) {
              await selectTask(taskToSelect)
            }
          }
        } catch (error) {
          console.error('Error auto-selecting newest task:', error)
        }
      }
    }

    autoSelectNewestTask()
  }, [tasks, selectedTask])

  useEffect(() => {
    return () => {
      // Clean up subscription on unmount
      if (chatSubscription) {
        chatSubscription.unsubscribe()
      }
    }
  }, [chatSubscription])

  useEffect(() => {
    // Get current user ID
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getCurrentUser()
  }, [])

  const loadUnreadCounts = async () => {
    try {
      const counts: Record<string, number> = {}
      for (const task of tasks) {
        const count = await taskChatService.getUnreadMessageCount(task.id)
        if (count > 0) {
          counts[task.id] = count
        }
      }
      setUnreadCounts(counts)
    } catch (error) {
      console.error('Error loading unread counts:', error)
    }
  }

  useEffect(() => {
    applyFiltersAndSearch()
  }, [applyFiltersAndSearch])

  const loadTasks = async () => {
    setLoading(true)
    // Clear current selection to trigger auto-selection after loading
    if (selectedTask) {
      deselectTask()
    }
    await fetchTasks()
    setLoading(false)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    // Clear current selection to trigger auto-selection after refresh
    if (selectedTask) {
      deselectTask()
    }
    await fetchTasks()
    setRefreshing(false)
  }

  const selectTask = async (task: Task) => {
    setSelectedTask(task)
    // Start from right edge (hidden)
    panelAnimation.setValue(0)
    Animated.timing(panelAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start()

    // Load messages and subscribe to real-time updates
    await loadTaskMessages(task.id)
    subscribeToTaskMessages(task.id)
    
    // Mark messages as read
    await taskChatService.markMessagesAsRead(task.id)
    setUnreadCounts(prev => ({ ...prev, [task.id]: 0 }))
  }

  const deselectTask = () => {
    // Unsubscribe from chat updates
    if (chatSubscription) {
      chatSubscription.unsubscribe()
      setChatSubscription(null)
    }
    
    // Animate panel out
    Animated.timing(panelAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setSelectedTask(null)
      setMessages([])
      setNewMessage('')
    })
  }

  const loadTaskMessages = async (taskId: string) => {
    try {
      const taskMessages = await taskChatService.fetchTaskMessages(taskId)
      setMessages(taskMessages)
      // Scroll to bottom after messages are loaded
      setTimeout(() => {
        messagesScrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error) {
      console.error('Error loading task messages:', error)
      Alert.alert('Error', 'Failed to load task messages')
    }
  }

  const subscribeToTaskMessages = (taskId: string) => {
    console.log('Setting up subscription for task:', taskId)
    const subscription = taskChatService.subscribeToTaskMessages(
      taskId,
      (newMessage) => {
        console.log('Received new message via subscription:', newMessage.id, newMessage.message_text)
        // Check if message already exists to prevent duplicates
        setMessages(prev => {
          const messageExists = prev.some(msg => msg.id === newMessage.id)
          if (messageExists) {
            console.log('Message already exists, skipping:', newMessage.id)
            return prev
          }
          console.log('Adding new message to state:', newMessage.id)
          const updatedMessages = [...prev, newMessage]
          // Scroll to bottom when new message is received
          setTimeout(() => {
            messagesScrollViewRef.current?.scrollToEnd({ animated: true })
          }, 100)
          return updatedMessages
        })
        
        // Update unread count if message is not from current user
        if (newMessage.sender_id !== currentUserId) {
          setUnreadCounts(prev => ({ ...prev, [taskId]: (prev[taskId] || 0) + 1 }))
        }
      },
      (error) => {
        console.error('Real-time subscription error:', error)
      }
    )
    setChatSubscription(subscription)
  }

  const sendMessage = async () => {
    if (!selectedTask || !newMessage.trim() || sendingMessage) return

    setSendingMessage(true)
    try {
      console.log('Sending message:', newMessage.trim())
      const sentMessage = await taskChatService.sendMessage(selectedTask.id, newMessage.trim())
      console.log('Message sent successfully:', sentMessage.id, sentMessage.message_text)
      
      // Immediately add the sent message to local state for instant UI update
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(msg => msg.id === sentMessage.id)
        if (messageExists) {
          console.log('Sent message already exists in state, skipping:', sentMessage.id)
          return prev
        }
        console.log('Adding sent message to local state:', sentMessage.id)
        const updatedMessages = [...prev, sentMessage]
        // Scroll to bottom after sending message
        setTimeout(() => {
          messagesScrollViewRef.current?.scrollToEnd({ animated: true })
        }, 100)
        return updatedMessages
      })
      
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      Alert.alert('Error', 'Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  const handleStatusChange = async (newStatus: string, reason?: string) => {
    if (!selectedTask) return

    try {
      await taskChatService.updateTaskStatus(selectedTask.id, newStatus, reason)
      // Update local task state
      setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null)
      // Refresh tasks list
      await fetchTasks()
      Alert.alert('Success', 'Task status updated successfully')
    } catch (error) {
      console.error('Error updating task status:', error)
      Alert.alert('Error', 'Failed to update task status')
    }
  }

  const navigateToTaskDetail = (task: Task) => {
    navigation.navigate('TaskDetail', { taskId: task.id })
  }

  const navigateToAddTask = () => {
    navigation.navigate('AddEditTask')
  }

  const handleEditTask = () => {
    if (selectedTask) {
      navigation.navigate('AddEditTask', { taskId: selectedTask.id })
    }
  }

  const handleViewClient = () => {
    if (selectedTask && selectedTask.client_id) {
      navigation.navigate('Clients', {
        screen: 'ClientDetail',
        params: { clientId: selectedTask.client_id },
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return theme.colors.error
      case 'medium':
        return theme.colors.tertiary
      case 'low':
        return theme.colors.secondary
      default:
        return theme.colors.outline
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.colors.secondary
      case 'in_progress':
        return theme.colors.primary
      case 'pending':
        return theme.colors.tertiary
      case 'cancelled':
        return theme.colors.error
      default:
        return theme.colors.outline
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'in_progress':
        return 'In Progress'
      case 'completed':
        return 'Completed'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'High'
      case 'medium':
        return 'Medium'
      case 'low':
        return 'Low'
      default:
        return priority
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} day(s)`
    } else if (diffDays === 0) {
      return 'Due today'
    } else if (diffDays === 1) {
      return 'Due tomorrow'
    } else {
      return `Due in ${diffDays} day(s)`
    }
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  const renderTask = ({ item }: { item: Task }) => {
    const isSelected = selectedTask?.id === item.id;
    
    return (
      <Card
        style={[
          styles.taskCard,
          isSelected && styles.selectedTaskCard
        ]}
        onPress={() => selectTask(item)}
      >
        <Card.Content style={{ padding: 16 }}>
          <View style={styles.taskHeader}>
            <View style={styles.taskInfo}>
              <Text variant="titleMedium" style={styles.taskTitle}>
                {item.title}
              </Text>
              {item.client && item.client_id && (
                <Text variant="bodySmall" style={styles.clientName}>
                  (for {item.client.full_name})
                </Text>
              )}
              {item.assigned_user && (
                <Text variant="bodySmall" style={styles.assignedTo}>
                  Assigned to: {item.assigned_user.full_name}
                </Text>
              )}
            </View>
            <View style={styles.badges}>
              <Chip
                mode="outlined"
                textStyle={[styles.statusText, { color: getStatusColor(item.status) }]}
                style={[styles.statusChip, { borderColor: getStatusColor(item.status) }]}
              >
                {getStatusLabel(item.status)}
              </Chip>
              <Badge
                style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}
              >
                {getPriorityLabel(item.priority)}
              </Badge>
              {unreadCounts[item.id] > 0 && (
                <Badge
                  style={styles.unreadBadge}
                  size={20}
                >
                  {unreadCounts[item.id]}
                </Badge>
              )}
            </View>
          </View>
          
          {item.description && (
            <Text variant="bodyMedium" style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          
          {item.due_date && (
            <Text
              variant="bodySmall"
              style={[
                styles.dueDate,
                isOverdue(item.due_date) && styles.overdue
              ]}
            >
              📅 {formatDate(item.due_date)}
            </Text>
          )}
        </Card.Content>
      </Card>
    )
  }

  const renderTaskDetailPanel = () => {
    if (!selectedTask) return null

    const slideTransform = panelAnimation.interpolate({
       inputRange: [0, 1],
       outputRange: [400, 0], // Start from right (400px) to visible (0px)
     })
 
     const panelOpacity = panelAnimation.interpolate({
       inputRange: [0, 1],
       outputRange: [0, 1], // Start invisible to visible
     })

    return (
      <Animated.View 
        style={[
          styles.detailPanel, 
          { 
            width: '60%',
            opacity: panelOpacity,
            transform: [{ translateX: slideTransform }]
          }
        ]}
      >
        <Surface style={styles.detailSurface}>
          {/* Header with collapsible title */}
          <View style={styles.detailPanelHeader}>
            <TouchableOpacity 
              style={styles.titleSection}
              onPress={() => setIsTaskExpanded(!isTaskExpanded)}
            >
              <Text variant="titleMedium" style={styles.detailPanelTitle}>
                {selectedTask.title}
              </Text>
              <MaterialCommunityIcons 
                name={isTaskExpanded ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleEditTask} style={styles.actionIcon}>
                <MaterialCommunityIcons name="pencil" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={deselectTask} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Collapsible task details */}
          {isTaskExpanded && (
            <View style={styles.taskDetailsSection}>
              <View style={styles.taskDetailItem}>
                <Text style={styles.taskDetailLabel}>Description:</Text>
                <Text style={styles.taskDetailValue}>
                  {selectedTask.description || 'No description provided'}
                </Text>
              </View>
              <View style={styles.taskDetailItem}>
                <Text style={styles.taskDetailLabel}>Due Date:</Text>
                <Text style={styles.taskDetailValue}>
                  {selectedTask.due_date ? formatDate(selectedTask.due_date) : 'No due date set'}
                </Text>
              </View>
              <View style={styles.taskDetailItem}>
                <Text style={styles.taskDetailLabel}>Created:</Text>
                <Text style={styles.taskDetailValue}>
                  {formatDate(selectedTask.created_at)}
                </Text>
              </View>
              
              {/* Status Change Buttons */}
              <View style={styles.statusActionsContainer}>
                <Text style={styles.statusActionsLabel}>Quick Status Updates:</Text>
                <View style={styles.statusButtonsRow}>
                  {selectedTask.status !== 'in_progress' && (
                    <Button
                      mode="outlined"
                      onPress={() => handleStatusChange('in_progress', 'Task started')}
                      style={styles.statusButton}
                      labelStyle={styles.statusButtonText}
                    >
                      Start Task
                    </Button>
                  )}
                  {selectedTask.status !== 'completed' && (
                    <Button
                      mode="contained"
                      onPress={() => handleStatusChange('completed', 'Task completed')}
                      style={[styles.statusButton, styles.completeButton]}
                      labelStyle={styles.statusButtonText}
                    >
                      Complete
                    </Button>
                  )}
                  {selectedTask.status !== 'pending' && (
                    <Button
                      mode="outlined"
                      onPress={() => handleStatusChange('pending', 'Task reset to pending')}
                      style={styles.statusButton}
                      labelStyle={styles.statusButtonText}
                    >
                      Reset
                    </Button>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Chat Interface */}
          <View style={styles.chatContainer}>
            <View style={styles.chatHeader}>
              <Text variant="titleSmall" style={styles.chatTitle}>Task Discussion</Text>
            </View>
            
            {/* Messages Area */}
            <ScrollView 
              ref={messagesScrollViewRef}
              style={styles.messagesContainer}
              showsVerticalScrollIndicator={true}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyMessagesContainer}>
                  <Text style={styles.emptyMessagesText}>No messages yet. Start the conversation!</Text>
                </View>
              ) : (
                messages.map((message) => {
                   const isCurrentUser = message.sender_id === currentUserId
                   const isSystemMessage = message.message_type === 'system'
                  
                  if (isSystemMessage) {
                    return (
                      <View key={message.id} style={styles.systemMessageContainer}>
                        <Text style={styles.systemMessageText}>{message.message_text}</Text>
                        <Text style={styles.systemMessageTime}>
                          {new Date(message.created_at).toLocaleString()}
                        </Text>
                      </View>
                    )
                  }
                  
                  return isCurrentUser ? (
                    // User message (right side)
                    <View key={message.id} style={styles.messageItemRight}>
                      <View style={styles.messageContentRight}>
                        <View style={styles.messageBubbleRight}>
                          <Text style={styles.messageTextRight}>{message.message_text}</Text>
                        </View>
                        <Text style={styles.messageTimeRight}>
                          You • {new Date(message.created_at).toLocaleTimeString()}
                        </Text>
                      </View>
                      <Avatar.Text size={32} label="ME" style={styles.messageAvatarRight} />
                    </View>
                  ) : (
                    // Reply message (left side)
                    <View key={message.id} style={styles.messageItemLeft}>
                      <Avatar.Text 
                        size={32} 
                        label={message.sender?.full_name?.substring(0, 2).toUpperCase() || 'U'} 
                        style={styles.messageAvatar} 
                      />
                      <View style={styles.messageContentLeft}>
                        <View style={styles.messageBubbleLeft}>
                          <Text style={styles.messageTextLeft}>{message.message_text}</Text>
                        </View>
                        <Text style={styles.messageTimeLeft}>
                          {message.sender?.full_name || 'Unknown'} • {new Date(message.created_at).toLocaleTimeString()}
                        </Text>
                      </View>
                    </View>
                  )
                })
              )}
            </ScrollView>
            
            {/* Message Input */}
            <View style={styles.messageInputContainer}>
              <TouchableOpacity style={styles.attachmentButton}>
                <MaterialCommunityIcons name="paperclip" size={24} color="#6c757d" />
              </TouchableOpacity>
              <TextInput
                style={styles.messageInput}
                placeholder="Type a message..."
                multiline
                maxLength={500}
                value={newMessage}
                onChangeText={setNewMessage}
                editable={!sendingMessage}
              />
              <TouchableOpacity 
                style={[styles.sendButton, (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!newMessage.trim() || sendingMessage}
              >
                {sendingMessage ? (
                  <ActivityIndicator size={20} color="#11998e" />
                ) : (
                  <MaterialCommunityIcons name="send" size={24} color="#11998e" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Surface>
      </Animated.View>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        {searchQuery || filter !== 'all' ? 'No tasks found' : 'No tasks yet'}
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        {searchQuery || filter !== 'all'
          ? 'Try adjusting your search or filters'
          : 'Create your first task to get started'}
      </Text>
      {!searchQuery && filter === 'all' && (
        <Button
          mode="contained"
          onPress={navigateToAddTask}
          style={styles.emptyButton}
        >
          Create Task
        </Button>
      )}
    </View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading tasks...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text variant="headlineMedium" style={styles.headerTitle}>
              Task Management
            </Text>
            <Text variant="bodyMedium" style={styles.headerSubtitle}>
              Manage your tasks and view detailed information
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Button
              mode="contained"
              icon="plus"
              onPress={navigateToAddTask}
              style={styles.addButton}
            >
              Add Task
            </Button>
          </View>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        {/* Left Panel - Task List */}
        <View style={[styles.taskListPanel, selectedTask && styles.taskListPanelCompact]}>
          <View style={styles.taskListContent}>
            {/* Search and Filters */}
            <View style={styles.searchSection}>
              <Searchbar
                placeholder="Search tasks..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
              />
              
              <View style={styles.filterRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  {(['all', 'pending', 'in_progress', 'completed'] as TaskFilter[]).map((filterOption) => (
                    <Chip
                      key={filterOption}
                      selected={filter === filterOption}
                      onPress={() => setFilter(filterOption)}
                      style={[
                        styles.filterChip,
                        filter === filterOption && styles.selectedFilterChip
                      ]}
                      textStyle={[
                        styles.filterChipText,
                        filter === filterOption && styles.selectedFilterChipText
                      ]}
                    >
                      {filterOption === 'all' ? 'All' : getStatusLabel(filterOption)}
                    </Chip>
                  ))}
                </ScrollView>
                
                <Menu
                  visible={menuVisible}
                  onDismiss={() => setMenuVisible(false)}
                  anchor={
                    <Button
                      mode="contained"
                      onPress={() => setMenuVisible(true)}
                      compact
                      icon="sort"
                      style={styles.sortButton}
                      buttonColor="#11998e"
                    >
                      Sort
                    </Button>
                  }
                >
                  <Menu.Item
                    onPress={() => {
                      setSortBy('due_date')
                      setMenuVisible(false)
                    }}
                    title="Due Date"
                    leadingIcon={sortBy === 'due_date' ? 'check' : undefined}
                  />
                  <Menu.Item
                    onPress={() => {
                      setSortBy('created_at')
                      setMenuVisible(false)
                    }}
                    title="Date Created"
                    leadingIcon={sortBy === 'created_at' ? 'check' : undefined}
                  />
                </Menu>
              </View>
            </View>

            {/* Task List */}
            <FlatList
              data={filteredTasks}
              renderItem={renderTask}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>

        {/* Right Panel - Task Details */}
        {renderTaskDetailPanel()}
      </View>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={navigateToAddTask}
      />
    </View>
  )
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  // Header Section
  headerSection: {
    backgroundColor: '#F3F4F6',
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#6c757d',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    backgroundColor: '#11998e',
  },
  // Main Content
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 24,
  },
  // Task List Panel
  taskListPanel: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginRight: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  taskListPanelCompact: {
    flex: 0.4,
  },
  taskListContent: {
    flex: 1,
  },
  // Search and Filters
  searchSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchBar: {
    marginBottom: 12,
    elevation: 0,
    backgroundColor: 'white',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterScroll: {
    flex: 1,
    marginRight: 12,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: 'white',
    borderColor: '#dee2e6',
  },
  selectedFilterChip: {
    backgroundColor: '#11998e',
    borderColor: '#11998e',
  },
  filterChipText: {
    color: '#6c757d',
    fontSize: 12,
  },
  selectedFilterChipText: {
    color: 'white',
    fontSize: 12,
  },
  sortButton: {
    minWidth: 80,
  },
  // Task List
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  taskCard: {
    marginBottom: 12,
    elevation: 1,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  selectedTaskCard: {
    borderColor: '#11998e',
    borderWidth: 2,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontWeight: '600',
    marginBottom: 4,
    color: '#212529',
  },
  clientName: {
    color: '#7C3AED',
    fontStyle: 'italic',
    marginBottom: 2,
    fontSize: 12,
  },
  assignedTo: {
    color: '#6c757d',
    marginBottom: 2,
    fontSize: 12,
  },
  description: {
    color: '#6c757d',
    marginBottom: 8,
    lineHeight: 18,
    fontSize: 13,
  },
  dueDate: {
    color: '#6c757d',
    fontWeight: '500',
    fontSize: 12,
  },
  overdue: {
    color: theme.colors.error,
    fontWeight: 'bold',
  },
  badges: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusChip: {
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  priorityBadge: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  // Detail Panel
  detailPanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  detailSurface: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#11998e',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailPanelTitle: {
    color: 'white',
    fontWeight: '600',
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    padding: 8,
    marginRight: 8,
  },
  closeButton: {
    padding: 4,
  },
  taskDetailsSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  taskDetailItem: {
    marginBottom: 12,
  },
  taskDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 4,
  },
  taskDetailValue: {
    fontSize: 14,
    color: '#212529',
    lineHeight: 20,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  chatHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  chatTitle: {
    fontWeight: '600',
    color: '#212529',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  // Left-aligned messages (replies)
  messageItemLeft: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  messageContentLeft: {
    flex: 1,
    marginLeft: 8,
  },
  messageBubbleLeft: {
    backgroundColor: '#f1f3f4',
    padding: 12,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    maxWidth: '80%',
  },
  messageTextLeft: {
    fontSize: 14,
    color: '#212529',
    lineHeight: 20,
  },
  messageTimeLeft: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 4,
    marginLeft: 4,
  },
  // Right-aligned messages (user)
  messageItemRight: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  messageContentRight: {
    flex: 1,
    marginRight: 8,
    alignItems: 'flex-end',
  },
  messageBubbleRight: {
    backgroundColor: '#11998e',
    padding: 12,
    borderRadius: 18,
    borderTopRightRadius: 4,
    maxWidth: '80%',
  },
  messageTextRight: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  messageTimeRight: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 4,
    marginRight: 4,
  },
  messageAvatar: {
    backgroundColor: '#11998e',
  },
  messageAvatarRight: {
    backgroundColor: '#6c757d',
  },
  attachmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  attachmentInfo: {
    marginLeft: 8,
    flex: 1,
  },
  attachmentName: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  attachmentSize: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: 'white',
  },
  attachmentButton: {
    padding: 8,
    marginRight: 8,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
     padding: 8,
     marginLeft: 8,
   },
   sendButtonDisabled: {
     opacity: 0.5,
   },
   systemMessageContainer: {
     alignItems: 'center',
     marginVertical: 8,
     paddingHorizontal: 16,
   },
   systemMessageText: {
     fontSize: 12,
     color: '#6c757d',
     fontStyle: 'italic',
     textAlign: 'center',
     backgroundColor: '#f8f9fa',
     paddingHorizontal: 12,
     paddingVertical: 6,
     borderRadius: 12,
   },
   systemMessageTime: {
     fontSize: 10,
     color: '#adb5bd',
     marginTop: 2,
   },
   emptyMessagesContainer: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     paddingVertical: 40,
   },
   emptyMessagesText: {
     fontSize: 14,
     color: '#6c757d',
     textAlign: 'center',
   },
   unreadBadge: {
     backgroundColor: '#dc3545',
     marginLeft: 8,
   },
   statusActionsContainer: {
     marginTop: 16,
     paddingTop: 16,
     borderTopWidth: 1,
     borderTopColor: '#e9ecef',
   },
   statusActionsLabel: {
     fontSize: 12,
     fontWeight: '600',
     color: '#6c757d',
     marginBottom: 8,
   },
   statusButtonsRow: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     gap: 8,
   },
   statusButton: {
     flex: 1,
     minWidth: 80,
   },
   statusButtonText: {
     fontSize: 11,
   },
   completeButton: {
     backgroundColor: '#28a745',
   },
   detailContent: {
     flex: 1,
     padding: 16,
   },
   // Profile Card
   profileCard: {
     marginBottom: 16,
     elevation: 2,
   },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  profileCompany: {
    color: '#6c757d',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priorityChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priorityChip: {
    marginLeft: 4,
  },
  // Info Card
  infoCard: {
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#212529',
    lineHeight: 20,
  },
  // Actions Card
  actionsCard: {
    marginBottom: 16,
    elevation: 2,
  },
  actionGrid: {
    gap: 8,
  },
  actionButton: {
    marginBottom: 8,
  },
  primaryAction: {
    backgroundColor: '#11998e',
  },
  actionButtonContent: {
    paddingVertical: 4,
  },
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#6c757d',
  },
  emptySubtitle: {
    textAlign: 'center',
    color: '#6c757d',
    marginBottom: 24,
  },
  emptyButton: {
    marginTop: 16,
    backgroundColor: '#11998e',
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#6c757d',
  },
  // FAB
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 100,
    backgroundColor: '#11998e',
  },
})

export default TasksScreen