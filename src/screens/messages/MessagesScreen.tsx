import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native'
import {
  Text,
  Card,
  Avatar,
  Button,
  Searchbar,
  FAB,
  Badge,
  ActivityIndicator,
  Chip,
} from 'react-native-paper'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { Message } from '../../types/database'
import { useAuth } from '../../contexts/AuthContext'

interface ConversationPreview {
  id: string
  clientId: string
  clientName: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  isFromClient: boolean
}

interface MessagesScreenProps {
  navigation: any
}

const MessagesScreen: React.FC<MessagesScreenProps> = ({ navigation }) => {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [filteredConversations, setFilteredConversations] = useState<ConversationPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const fetchConversations = async () => {
    if (!user) return

    try {
      // Get all messages with client information
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          client:clients(id, full_name)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching messages:', error)
        Alert.alert('Error', 'Failed to load messages. Please try again.')
        return
      }

      // Group messages by client and create conversation previews
      const conversationMap = new Map<string, ConversationPreview>()

      messages?.forEach((message) => {
        if (!message.client) return

        const clientId = message.client.id
        const existing = conversationMap.get(clientId)

        if (!existing || new Date(message.created_at) > new Date(existing.lastMessageTime)) {
          // Count unread messages for this client
          const unreadCount = messages.filter(
            (m) => 
              m.client?.id === clientId && 
              !m.is_read && 
              m.sender_id !== user.id
          ).length

          conversationMap.set(clientId, {
            id: clientId,
            clientId: clientId,
            clientName: message.client.full_name,
            lastMessage: message.content,
            lastMessageTime: message.created_at,
            unreadCount,
            isFromClient: message.sender_id !== user.id,
          })
        }
      })

      const conversationList = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime())

      setConversations(conversationList)
    } catch (error) {
      console.error('Error fetching conversations:', error)
      Alert.alert('Error', 'An unexpected error occurred.')
    }
  }

  const applyFiltersAndSearch = useCallback(() => {
    let filtered = [...conversations]

    // Apply unread filter
    if (filter === 'unread') {
      filtered = filtered.filter(conv => conv.unreadCount > 0)
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(conv =>
        conv.clientName.toLowerCase().includes(query) ||
        conv.lastMessage.toLowerCase().includes(query)
      )
    }

    setFilteredConversations(filtered)
  }, [conversations, filter, searchQuery])

  useFocusEffect(
    useCallback(() => {
      loadConversations()
    }, [])
  )

  useEffect(() => {
    applyFiltersAndSearch()
  }, [applyFiltersAndSearch])

  const loadConversations = async () => {
    setLoading(true)
    await fetchConversations()
    setLoading(false)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchConversations()
    setRefreshing(false)
  }

  const navigateToConversation = (conversation: ConversationPreview) => {
    navigation.navigate('Conversation', { 
      clientId: conversation.clientId,
      clientName: conversation.clientName 
    })
  }

  const navigateToNewMessage = () => {
    navigation.navigate('NewMessage')
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffTime / (1000 * 60))

    if (diffDays > 0) {
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
    } else if (diffHours > 0) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
    } else if (diffMinutes > 0) {
      return diffMinutes === 1 ? '1 min ago' : `${diffMinutes} mins ago`
    } else {
      return 'Just now'
    }
  }

  const renderConversation = ({ item }: { item: ConversationPreview }) => (
    <Card style={styles.conversationCard} onPress={() => navigateToConversation(item)}>
      <Card.Content>
        <View style={styles.conversationHeader}>
          <Avatar.Text
            size={48}
            label={item.clientName.substring(0, 2).toUpperCase()}
            style={styles.avatar}
          />
          <View style={styles.conversationInfo}>
            <View style={styles.nameRow}>
              <Text variant="titleMedium" style={styles.clientName}>
                {item.clientName}
              </Text>
              <Text variant="bodySmall" style={styles.time}>
                {formatTime(item.lastMessageTime)}
              </Text>
            </View>
            <View style={styles.messageRow}>
              <Text 
                variant="bodyMedium" 
                style={[
                  styles.lastMessage,
                  item.unreadCount > 0 && styles.unreadMessage
                ]}
                numberOfLines={1}
              >
                {!item.isFromClient && 'You: '}{item.lastMessage}
              </Text>
              {item.unreadCount > 0 && (
                <Badge style={styles.unreadBadge}>
                  {item.unreadCount}
                </Badge>
              )}
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        {searchQuery || filter === 'unread' ? 'No conversations found' : 'No messages yet'}
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        {searchQuery || filter === 'unread'
          ? 'Try adjusting your search or filters'
          : 'Start a conversation with your clients'}
      </Text>
      {!searchQuery && filter === 'all' && (
        <Button
          mode="contained"
          onPress={navigateToNewMessage}
          style={styles.emptyButton}
        >
          Send Message
        </Button>
      )}
    </View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search conversations..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        <View style={styles.filterRow}>
          <View style={styles.filterChips}>
            <Chip
              selected={filter === 'all'}
              onPress={() => setFilter('all')}
              style={styles.filterChip}
            >
              All
            </Chip>
            <Chip
              selected={filter === 'unread'}
              onPress={() => setFilter('unread')}
              style={styles.filterChip}
            >
              Unread
            </Chip>
          </View>
        </View>
      </View>

      <FlatList
        data={filteredConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="message-plus"
        style={styles.fab}
        onPress={navigateToNewMessage}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchbar: {
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    marginRight: 4,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  conversationCard: {
    marginBottom: 8,
    elevation: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 12,
    backgroundColor: '#007AFF',
  },
  conversationInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clientName: {
    fontWeight: 'bold',
    flex: 1,
  },
  time: {
    color: '#888',
    fontSize: 12,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  unreadMessage: {
    fontWeight: 'bold',
    color: '#333',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    color: '#FFFFFF',
    fontSize: 12,
    minWidth: 20,
    height: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#666',
  },
  emptySubtitle: {
    textAlign: 'center',
    color: '#888',
    marginBottom: 24,
  },
  emptyButton: {
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
})

export default MessagesScreen