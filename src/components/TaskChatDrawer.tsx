import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import {
  Text,
  TextInput,
  IconButton,
  Card,
  Chip,
  ActivityIndicator,
  useTheme,
  Avatar,
} from 'react-native-paper'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'

interface TaskMessage {
  id: string
  task_id: string
  user_id: string
  message: string
  message_type: 'user' | 'system'
  created_at: string
  user?: {
    full_name: string
    role: string
  }
}

interface TaskChatDrawerProps {
  taskId: string
  visible: boolean
  onClose: () => void
}

const TaskChatDrawer: React.FC<TaskChatDrawerProps> = ({
  taskId,
  visible,
  onClose,
}) => {
  const theme = useTheme()
  const { user } = useAuth()
  const styles = createStyles(theme)
  const flatListRef = useRef<FlatList>(null)
  
  const [messages, setMessages] = useState<TaskMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (visible && taskId) {
      fetchMessages()
      subscribeToMessages()
    }
    
    return () => {
      // Cleanup subscription
    }
  }, [visible, taskId])

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('task_messages')
        .select(`
          *,
          user:profiles!task_messages_user_id_fkey(full_name, role)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
        Alert.alert('Error', 'Failed to load messages')
        return
      }

      setMessages(data || [])
      
      // Scroll to bottom after loading messages
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error) {
      console.error('Error fetching messages:', error)
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel(`task_messages:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_messages',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          const newMessage = payload.new as TaskMessage
          setMessages(prev => [...prev, newMessage])
          
          // Scroll to bottom when new message arrives
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true })
          }, 100)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('task_messages')
        .insert({
          task_id: taskId,
          user_id: user.id,
          message: newMessage.trim(),
          message_type: 'user',
        })

      if (error) {
        console.error('Error sending message:', error)
        Alert.alert('Error', 'Failed to send message')
        return
      }

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setSending(false)
    }
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }

  const renderMessage = ({ item }: { item: TaskMessage }) => {
    const isCurrentUser = item.user_id === user?.id
    const isSystemMessage = item.message_type === 'system'

    if (isSystemMessage) {
      return (
        <View style={styles.systemMessageContainer}>
          <Chip
            icon="information"
            mode="outlined"
            style={styles.systemMessage}
            textStyle={styles.systemMessageText}
          >
            {item.message}
          </Chip>
          <Text style={styles.messageTime}>
            {formatMessageTime(item.created_at)}
          </Text>
        </View>
      )
    }

    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
        ]}
      >
        {!isCurrentUser && (
          <Avatar.Text
            size={32}
            label={item.user?.full_name?.charAt(0) || 'U'}
            style={styles.avatar}
          />
        )}
        
        <View
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          ]}
        >
          {!isCurrentUser && (
            <Text style={styles.senderName}>
              {item.user?.full_name || 'Unknown User'}
            </Text>
          )}
          
          <Text
            style={[
              styles.messageText,
              isCurrentUser ? styles.currentUserText : styles.otherUserText,
            ]}
          >
            {item.message}
          </Text>
          
          <Text
            style={[
              styles.messageTime,
              isCurrentUser ? styles.currentUserTime : styles.otherUserTime,
            ]}
          >
            {formatMessageTime(item.created_at)}
          </Text>
        </View>
        
        {isCurrentUser && (
          <Avatar.Text
            size={32}
            label={user?.user_metadata?.full_name?.charAt(0) || 'Y'}
            style={styles.avatar}
          />
        )}
      </View>
    )
  }

  if (!visible) return null

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.headerTitle}>
          Task Chat
        </Text>
        <IconButton
          icon="close"
          onPress={onClose}
          size={24}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true })
          }}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            style={styles.textInput}
            multiline
            maxLength={500}
            disabled={sending}
          />
          <IconButton
            icon="send"
            mode="contained"
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
            loading={sending}
            size={20}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.onSurfaceVariant,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  currentUserMessage: {
    justifyContent: 'flex-end',
  },
  otherUserMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
  },
  currentUserBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: theme.colors.surfaceVariant,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  currentUserText: {
    color: theme.colors.onPrimary,
  },
  otherUserText: {
    color: theme.colors.onSurfaceVariant,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  currentUserTime: {
    color: theme.colors.onPrimary + '80',
    textAlign: 'right',
  },
  otherUserTime: {
    color: theme.colors.onSurfaceVariant + '80',
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessage: {
    backgroundColor: theme.colors.secondaryContainer,
  },
  systemMessageText: {
    color: theme.colors.onSecondaryContainer,
    fontSize: 12,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
    backgroundColor: theme.colors.surface,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    gap: 8,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
  },
})

export default TaskChatDrawer