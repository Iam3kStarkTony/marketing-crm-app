import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { ConversationParticipant } from '../types/database'
import { formatDistanceToNow, isToday, format } from 'date-fns'

interface MessengerScreenProps {
  navigation: any
}

const MessengerScreen: React.FC<MessengerScreenProps> = ({ navigation }) => {
  const { user, profile } = useAuth()
  const { theme } = useTheme()
  const styles = getStyles(theme)
  const [clients, setClients] = useState<ConversationParticipant[]>([])
  const [agents, setAgents] = useState<ConversationParticipant[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'clients' | 'agents'>('clients')

  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user])

  const loadConversations = async () => {
    try {
      setLoading(true)
      
      // Call the database function to get conversation participants
      const { data, error } = await supabase
        .rpc('get_conversation_participants', { user_id: user?.id })
      
      if (error) {
        console.error('Error loading conversations:', error)
        Alert.alert('Error', 'Failed to load conversations')
        return
      }

      // Separate clients and team members
      const clientConversations = data?.filter(
        (participant: ConversationParticipant) => 
          participant.conversation_type === 'client_communication'
      ) || []
      
      const teamConversations = data?.filter(
        (participant: ConversationParticipant) => 
          participant.conversation_type === 'team_communication'
      ) || []

      setClients(clientConversations)
      setAgents(teamConversations)
    } catch (error) {
      console.error('Error loading conversations:', error)
      Alert.alert('Error', 'Failed to load conversations')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadConversations()
  }

  const formatMessageTime = (timestamp: string | null) => {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    
    if (isToday(date)) {
      return format(date, 'HH:mm')
    } else {
      return format(date, 'MMM dd')
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

  const navigateToConversation = (participant: ConversationParticipant) => {
    if (participant.conversation_type === 'client_communication') {
      navigation.navigate('Chat', {
        clientId: participant.participant_id,
        clientName: participant.participant_name,
        participantName: participant.participant_name,
        messageCategory: 'client_communication'
      })
    } else {
      navigation.navigate('Chat', {
        recipientId: participant.participant_id,
        recipientName: participant.participant_name,
        participantName: participant.participant_name,
        messageCategory: 'team_communication'
      })
    }
  }

  const renderConversationItem = ({ item }: { item: ConversationParticipant }) => {
    const isUnread = item.unread_count > 0
    
    return (
      <TouchableOpacity
        style={[styles.conversationItem, isUnread && styles.unreadItem]}
        onPress={() => navigateToConversation(item)}
      >
        <View style={styles.avatarContainer}>
          {item.participant_avatar ? (
            <Image
              source={{ uri: item.participant_avatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {getInitials(item.participant_name)}
              </Text>
            </View>
          )}
          {isUnread && <View style={styles.unreadDot} />}
        </View>
        
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.participantName, isUnread && styles.unreadText]}>
              {item.participant_name}
            </Text>
            <Text style={styles.messageTime}>
              {formatMessageTime(item.last_message_time)}
            </Text>
          </View>
          
          <View style={styles.messagePreview}>
            <Text
              style={[styles.lastMessage, isUnread && styles.unreadText]}
              numberOfLines={1}
            >
              {item.last_message || 'No messages yet'}
            </Text>
            {isUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unread_count > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const filteredClients = clients.filter(client =>
    client.participant_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredAgents = agents.filter(agent =>
    agent.participant_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderTabContent = () => {
    const data = activeTab === 'clients' ? filteredClients : filteredAgents
    const emptyMessage = activeTab === 'clients' ? 'No client conversations' : 'No team conversations'
    
    return (
      <FlatList
        data={data}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.participant_id}
        style={styles.conversationList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={activeTab === 'clients' ? 'people-outline' : 'business-outline'}
              size={64}
              color={theme.colors.outline}
            />
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        }
      />
    )
  }

  const showTabs = profile?.role === 'admin'
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('NewMessage')}
          style={styles.newMessageButton}
        >
          <Ionicons name="create-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.onSurfaceVariant} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.colors.onSurfaceVariant}
        />
      </View>

      {/* Tabs for Admin */}
      {showTabs && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'clients' && styles.activeTab]}
            onPress={() => setActiveTab('clients')}
          >
            <Text style={[styles.tabText, activeTab === 'clients' && styles.activeTabText]}>
              Clients ({filteredClients.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'agents' && styles.activeTab]}
            onPress={() => setActiveTab('agents')}
          >
            <Text style={[styles.tabText, activeTab === 'agents' && styles.activeTabText]}>
              Team ({filteredAgents.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Conversation List */}
      {showTabs ? (
        renderTabContent()
      ) : (
        <FlatList
          data={agents} // Non-admin users only see team conversations (admins)
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.participant_id}
          style={styles.conversationList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={styles.emptyIcon.color} />
              <Text style={styles.emptyText}>No conversations</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  newMessageButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceVariant,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
  },
  activeTabText: {
    color: theme.colors.primary,
  },
  conversationList: {
    flex: 1,
    paddingBottom: theme.spacing.xl,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  unreadItem: {
    backgroundColor: theme.colors.secondaryContainer,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: theme.colors.onPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.error,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  messageTime: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  messagePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginRight: 8,
  },
  unreadText: {
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: theme.colors.onPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    marginTop: 16,
  },
})

export default MessengerScreen