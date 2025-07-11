import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { Message, Client, Profile } from '../../types/database'
import { format, isToday, isYesterday } from 'date-fns'

interface ConversationDetailScreenProps {
  navigation: any
}

interface MessageWithSender extends Message {
  sender_name?: string
  sender_avatar?: string
  is_own_message: boolean
}

interface RouteParams {
  clientId?: string
  clientName?: string
  recipientId?: string
  recipientName?: string
  messageCategory: 'client_communication' | 'team_communication'
}

const ConversationDetailScreen: React.FC<ConversationDetailScreenProps> = ({ navigation }) => {
  const route = useRoute()
  const { clientId, clientName, recipientId, recipientName, messageCategory } = (route.params as RouteParams) || {}
  const { user, profile } = useAuth()
  const { theme } = useTheme()
  
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [participant, setParticipant] = useState<Client | Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const flatListRef = useRef<FlatList>(null)

  const isClientConversation = messageCategory === 'client_communication'
  const participantId = isClientConversation ? clientId : recipientId
  const participantName = isClientConversation ? clientName : recipientName

  useFocusEffect(
    React.useCallback(() => {
      if (participantId) {
        fetchConversation()
      }
    }, [participantId, messageCategory])
  )

  useEffect(() => {
    if (participantId) {
      // Set up real-time subscription for new messages
      const channel = supabase
        .channel(`conversation-${participantId}-${messageCategory}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: isClientConversation 
              ? `client_id=eq.${participantId}`
              : `and(message_category=eq.team_communication,or(and(sender_id=eq.${user?.id},recipient_id=eq.${participantId}),and(sender_id=eq.${participantId},recipient_id=eq.${user?.id})))`,
          },
          (payload) => {
            const newMessage = payload.new as Message
            const messageWithSender: MessageWithSender = {
              ...newMessage,
              is_own_message: newMessage.sender_id === user?.id,
            }
            setMessages(prev => [...prev, messageWithSender])
            
            // Scroll to bottom when new message arrives
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true })
            }, 100)
          }
        )
        .subscribe()

      return () => {
        channel.unsubscribe()
      }
    }
  }, [participantId, messageCategory, user?.id, isClientConversation])

  const fetchConversation = async () => {
    if (!participantId || !user?.id) return

    setLoading(true)
    try {
      // Fetch participant info
      if (isClientConversation) {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', participantId)
          .single()

        if (clientError) {
          console.error('Error fetching client:', clientError)
          Alert.alert('Error', 'Client not found.')
          navigation.goBack()
          return
        }
        setParticipant(clientData)
      } else {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', participantId)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          Alert.alert('Error', 'User not found.')
          navigation.goBack()
          return
        }
        setParticipant(profileData)
      }

      // Fetch messages
      let messagesQuery = supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(full_name, avatar_url)
        `)
        .eq('message_category', messageCategory)
        .order('created_at', { ascending: true })

      if (isClientConversation) {
        messagesQuery = messagesQuery.eq('client_id', participantId)
      } else {
        messagesQuery = messagesQuery.or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${participantId}),and(sender_id.eq.${participantId},recipient_id.eq.${user.id})`
        )
      }

      const { data: messagesData, error: messagesError } = await messagesQuery

      if (messagesError) {
        console.error('Error fetching messages:', messagesError)
        Alert.alert('Error', 'Failed to load conversation.')
        return
      }

      // Transform messages to include sender info
      const transformedMessages: MessageWithSender[] = (messagesData || []).map(msg => ({
        ...msg,
        sender_name: msg.sender?.full_name || 'Unknown',
        sender_avatar: msg.sender?.avatar_url,
        is_own_message: msg.sender_id === user?.id,
      }))

      setMessages(transformedMessages)

      // Mark messages as read
      await markMessagesAsRead()
    } catch (error) {
      console.error('Error fetching conversation:', error)
      Alert.alert('Error', 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const markMessagesAsRead = async () => {
    if (!participantId || !user?.id) return

    try {
      let updateQuery = supabase
        .from('messages')
        .update({ is_read: true })
        .eq('message_category', messageCategory)
        .neq('sender_id', user.id)
        .eq('is_read', false)

      if (isClientConversation) {
        updateQuery = updateQuery.eq('client_id', participantId)
      } else {
        updateQuery = updateQuery
          .eq('sender_id', participantId)
          .eq('recipient_id', user.id)
      }

      await updateQuery
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !user?.id || !participantId) return

    setSending(true)
    try {
      const messageData: Partial<Message> = {
        content: newMessage.trim(),
        sender_id: user.id,
        sender_type: profile?.role as 'agent' | 'client' | 'admin' | 'manager',
        message_type: 'text',
        message_category: messageCategory,
        is_read: false,
      }

      if (isClientConversation) {
        messageData.client_id = participantId
      } else {
        messageData.recipient_id = participantId
      }

      const { error } = await supabase
        .from('messages')
        .insert([messageData])

      if (error) {
        console.error('Error sending message:', error)
        Alert.alert('Error', 'Failed to send message. Please try again.')
        return
      }

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      Alert.alert('Error', 'An unexpected error occurred.')
    } finally {
      setSending(false)
    }
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    
    if (isToday(date)) {
      return format(date, 'HH:mm')
    } else if (isYesterday(date)) {
      return 'Yesterday ' + format(date, 'HH:mm')
    } else {
      return format(date, 'MMM dd, HH:mm')
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const renderMessage = ({ item }: { item: MessageWithSender }) => {
    return (
      <View
        style={[
          styles.messageContainer,
          item.is_own_message ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {!item.is_own_message && (
          <View style={styles.avatarContainer}>
            {item.sender_avatar ? (
              <Image
                source={{ uri: item.sender_avatar }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {getInitials(item.sender_name || 'U')}
                </Text>
              </View>
            )}
          </View>
        )}
        
        <View
          style={[
            styles.messageBubble,
            item.is_own_message ? styles.ownBubble : styles.otherBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              item.is_own_message ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              item.is_own_message ? styles.ownMessageTime : styles.otherMessageTime,
            ]}
          >
            {formatMessageTime(item.created_at)}
          </Text>
        </View>
      </View>
    )
  }

  const renderHeader = () => {
    if (!participant) return null

    const name = isClientConversation 
      ? (participant as Client).name 
      : (participant as Profile).full_name
    
    const subtitle = isClientConversation 
      ? (participant as Client).company 
      : (participant as Profile).role
    
    const avatar = isClientConversation 
      ? (participant as Client).avatar_url 
      : (participant as Profile).avatar_url

    return (
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {getInitials(name || 'U')}
              </Text>
            </View>
          )}
          
          <View style={styles.headerText}>
            <Text style={styles.headerName}>{name}</Text>
            {subtitle && (
              <Text style={styles.headerSubtitle}>{subtitle}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="call-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="videocam-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const styles = getStyles(theme)
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                No messages yet. Start the conversation!
              </Text>
            </View>
          }
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false })
            }
          }}
        />
        
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              multiline
              maxLength={1000}
              style={styles.textInput}
              editable={!sending}
              placeholderTextColor={theme.colors.onSurfaceVariant}
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
              style={[
                styles.sendButton,
                (!newMessage.trim() || sending) && styles.sendButtonDisabled
              ]}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={(!newMessage.trim() || sending) ? theme.colors.onSurfaceVariant : theme.colors.primary} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 2,
    marginHorizontal: 16,
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    marginTop: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: theme.colors.onSurface,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#8E8E93',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.onSurface,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    padding: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
})

export default ConversationDetailScreen