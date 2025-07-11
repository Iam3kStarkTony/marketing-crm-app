import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native'
import {
  Text,
  Card,
  Avatar,
  Button,
  Searchbar,
  FAB,
  Chip,
  ActivityIndicator,
  Menu,
  Divider,
  Title,
  List,
} from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { Client, ClientFilter, SortOption } from '../../types/database'
import { spacing, shadows } from '../../config/theme'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../contexts/ThemeContext'

interface ClientsScreenProps {
  navigation: any
}

const ClientsScreen: React.FC<ClientsScreenProps> = ({ navigation }) => {
  const { theme } = useTheme()
  const styles = createStyles(theme)
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<ClientFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [menuVisible, setMenuVisible] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [panelAnimation] = useState(new Animated.Value(0))

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order(sortBy === 'name' ? 'full_name' : 'created_at', {
          ascending: sortBy === 'name',
        })

      if (error) {
        console.error('Error fetching clients:', error)
        Alert.alert('Error', 'Failed to load clients. Please try again.')
        return
      }

      setClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
      Alert.alert('Error', 'An unexpected error occurred.')
    }
  }

  const applyFiltersAndSearch = useCallback(() => {
    let filtered = [...clients]

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(client => client.status === filter)
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(client =>
        client.full_name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        client.company?.toLowerCase().includes(query)
      )
    }

    setFilteredClients(filtered)
  }, [clients, filter, searchQuery])

  useFocusEffect(
    useCallback(() => {
      loadClients()
    }, [])
  )

  useEffect(() => {
    applyFiltersAndSearch()
  }, [applyFiltersAndSearch])

  const loadClients = async () => {
    setLoading(true)
    await fetchClients()
    setLoading(false)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchClients()
    setRefreshing(false)
  }

  const selectClient = (client: Client) => {
    setSelectedClient(client)
    // Start from right edge (hidden)
    panelAnimation.setValue(0)
    Animated.timing(panelAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }

  const deselectClient = () => {
    // Animate panel out
    Animated.timing(panelAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setSelectedClient(null)
    })
  }

  const navigateToAddClient = () => {
    navigation.navigate('AddEditClient')
  }

  const handleEditClient = () => {
    if (selectedClient) {
      navigation.navigate('AddEditClient', { clientId: selectedClient.id })
    }
  }

  const handleCreateTask = () => {
    if (selectedClient) {
      navigation.navigate('AddEditTask', { clientId: selectedClient.id })
    }
  }

  const handleSendMessage = () => {
    if (selectedClient) {
      navigation.navigate('Conversation', { 
        clientId: selectedClient.id,
        clientName: selectedClient.full_name 
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return theme.colors.secondary
      case 'inactive':
        return theme.colors.tertiary
      case 'prospect':
        return theme.colors.primary
      default:
        return theme.colors.outline
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active'
      case 'inactive':
        return 'Inactive'
      case 'prospect':
        return 'Prospect'
      default:
        return status
    }
  }

  const renderClient = ({ item }: { item: Client }) => {
    const isSelected = selectedClient?.id === item.id;
    
    return (
      <Card
        style={[
          styles.clientCard,
          isSelected && styles.selectedClientCard
        ]}
        onPress={() => selectClient(item)}
      >
        <Card.Content style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar.Text
              size={48}
              label={item.full_name.split(' ').map(n => n[0]).join('')}
              style={{
                backgroundColor: getStatusColor(item.status),
                marginRight: 16
              }}
            />
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={{ 
                fontWeight: '600', 
                color: '#212529',
                marginBottom: 4 
              }}>
                {item.full_name}
              </Text>
              {item.company && (
                <Text variant="bodyMedium" style={{ 
                  color: '#6c757d',
                  marginBottom: 6 
                }}>
                  {item.company}
                </Text>
              )}
              <Chip
                compact
                style={{
                  backgroundColor: getStatusColor(item.status),
                  alignSelf: 'flex-start'
                }}
                textStyle={{
                  color: 'white',
                  fontSize: 11,
                  fontWeight: '500'
                }}
              >
                {getStatusLabel(item.status)}
              </Chip>
            </View>
            {isSelected && (
              <MaterialCommunityIcons 
                name="chevron-right" 
                size={24} 
                color="#11998e" 
              />
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="account-group-outline"
          size={64}
          color={theme.colors.onSurfaceVariant}
          style={{ marginBottom: 16 }}
        />
      <Text style={styles.emptyText}>No clients found</Text>
        <Text style={styles.emptySubtext}>
          {searchQuery || filter !== 'all'
            ? 'Try adjusting your search or filters'
            : 'Start building your client base by adding your first client'}
        </Text>
        {(!searchQuery && filter === 'all') && (
          <Button
            mode="contained"
            onPress={navigateToAddClient}
            buttonColor="#11998e"
            style={{ marginTop: 16, borderRadius: 20 }}
          >
            Add Your First Client
          </Button>
        )}
      </View>
    )
  }

  const renderClientDetailPanel = () => {
    if (!selectedClient) return null

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
        <View style={styles.detailSurface}>
          {/* Detail Panel Header */}
          <View style={styles.detailPanelHeader}>
            <Text variant="titleLarge" style={styles.detailPanelTitle}>
              Client Details
            </Text>
            <TouchableOpacity onPress={deselectClient} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
            {/* Client Profile Card */}
            <Card style={styles.profileCard}>
              <Card.Content>
                <View style={styles.profileHeader}>
                  <Avatar.Text
                    size={64}
                    label={selectedClient.full_name.substring(0, 2).toUpperCase()}
                    style={[styles.profileAvatar, { backgroundColor: getStatusColor(selectedClient.status) }]}
                  />
                  <View style={styles.profileInfo}>
                    <Text variant="headlineSmall" style={styles.profileName}>
                      {selectedClient.full_name}
                    </Text>
                    {selectedClient.company && (
                      <Text variant="bodyMedium" style={styles.profileCompany}>
                        {selectedClient.company}
                      </Text>
                    )}
                    <Chip
                      mode="flat"
                      compact
                      textStyle={[styles.statusChipText, { color: 'white' }]}
                      style={[styles.statusChip, { backgroundColor: getStatusColor(selectedClient.status) }]}
                    >
                      {getStatusLabel(selectedClient.status)}
                    </Chip>
                  </View>
                </View>
              </Card.Content>
            </Card>

            {/* Contact Information Card */}
            <Card style={styles.infoCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Contact Information
                </Text>
                <View style={styles.infoList}>
                  <View style={styles.infoItem}>
                    <MaterialCommunityIcons name="email" size={20} color="#11998e" />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Email</Text>
                      <Text style={styles.infoValue}>{selectedClient.email}</Text>
                    </View>
                  </View>
                  {selectedClient.phone && (
                    <View style={styles.infoItem}>
                      <MaterialCommunityIcons name="phone" size={20} color="#11998e" />
                      <View style={styles.infoTextContainer}>
                        <Text style={styles.infoLabel}>Phone</Text>
                        <Text style={styles.infoValue}>{selectedClient.phone}</Text>
                      </View>
                    </View>
                  )}
                  {selectedClient.address && (
                    <View style={styles.infoItem}>
                      <MaterialCommunityIcons name="map-marker" size={20} color="#11998e" />
                      <View style={styles.infoTextContainer}>
                        <Text style={styles.infoLabel}>Address</Text>
                        <Text style={styles.infoValue}>{selectedClient.address}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </Card.Content>
            </Card>

            {/* Quick Actions Card */}
            <Card style={styles.actionsCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Quick Actions
                </Text>
                <View style={styles.actionGrid}>
                  <Button
                    mode="contained"
                    icon="pencil"
                    onPress={handleEditClient}
                    style={[styles.actionButton, styles.primaryAction]}
                    contentStyle={styles.actionButtonContent}
                  >
                    Edit Client
                  </Button>
                  <Button
                    mode="outlined"
                    icon="message-text"
                    onPress={handleSendMessage}
                    style={styles.actionButton}
                    contentStyle={styles.actionButtonContent}
                  >
                    Send Message
                  </Button>
                  <Button
                    mode="outlined"
                    icon="plus-circle"
                    onPress={handleCreateTask}
                    style={styles.actionButton}
                    contentStyle={styles.actionButtonContent}
                  >
                    Create Task
                  </Button>
                </View>
              </Card.Content>
            </Card>

            {/* Notes Card */}
            {selectedClient.notes && (
              <Card style={styles.notesCard}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.cardTitle}>
                    Additional Notes
                  </Text>
                  <Text style={styles.notesContent}>
                    {selectedClient.notes}
                  </Text>
                </Card.Content>
              </Card>
            )}
          </ScrollView>
        </View>
      </Animated.View>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading clients...</Text>
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
              Client Management
            </Text>
            <Text variant="bodyMedium" style={styles.headerSubtitle}>
              Manage your clients and view detailed information
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Button
              mode="contained"
              icon="plus"
              onPress={navigateToAddClient}
              style={styles.addButton}
            >
              Add Client
            </Button>
          </View>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        {/* Left Panel - Client List */}
        <View style={[styles.clientListPanel, selectedClient && styles.clientListPanelCompact]}>
          <View style={styles.clientListContent}>
            {/* Search and Filters */}
            <View style={styles.searchSection}>
              <Searchbar
                placeholder="Search clients..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
              />
              
              <View style={styles.filterRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  {(['all', 'active', 'inactive', 'prospect'] as ClientFilter[]).map((filterOption) => (
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
                      setSortBy('name')
                      setMenuVisible(false)
                    }}
                    title="Name"
                    leadingIcon={sortBy === 'name' ? 'check' : undefined}
                  />
                  <Menu.Item
                    onPress={() => {
                      setSortBy('created_at')
                      setMenuVisible(false)
                    }}
                    title="Date Added"
                    leadingIcon={sortBy === 'created_at' ? 'check' : undefined}
                  />
                </Menu>
              </View>
            </View>

            {/* Client List */}
            <FlatList
              data={filteredClients}
              renderItem={renderClient}
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

        {/* Right Panel - Client Details */}
        {renderClientDetailPanel()}
      </View>
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
  // Client List Panel
  clientListPanel: {
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
  clientListPanelCompact: {
    flex: 0.4,
  },
  clientListContent: {
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
    backgroundColor: '#f8f9fa',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterScroll: {
    flex: 1,
    marginRight: 8,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#f8f9fa',
  },
  selectedFilterChip: {
    backgroundColor: '#11998e',
  },
  filterChipText: {
    color: '#6c757d',
  },
  selectedFilterChipText: {
    color: 'white',
  },
  sortButton: {
    backgroundColor: '#f8f9fa',
  },
  // Client Cards
  listContainer: {
    padding: 16,
  },
  compactClientCard: {
    marginBottom: 8,
    elevation: 1,
    borderRadius: 12,
  },
  selectedClientCard: {
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#11998e',
    backgroundColor: '#f0fffe',
  },
  compactClientContent: {
    padding: 12,
  },
  compactClientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactAvatar: {
    marginRight: 12,
  },
  compactClientInfo: {
    flex: 1,
  },
  compactClientName: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  compactCompany: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: 2,
  },
  compactEmail: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  compactStatusChip: {
    minWidth: 24,
    height: 24,
  },
  compactStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  // Detail Panel
  detailPanel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 1000,
  },
  detailSurface: {
    flex: 1,
    backgroundColor: 'white',
  },
  detailPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  detailPanelTitle: {
    fontWeight: '600',
    color: '#212529',
  },
  closeButton: {
    margin: 0,
  },
  detailContent: {
    flex: 1,
    padding: 20,
  },
  // Profile Card
  profileCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: 'white',
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
  statusChip: {
    alignSelf: 'flex-start',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Info Cards
  infoCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 1,
    backgroundColor: 'white',
  },
  actionsCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 1,
    backgroundColor: 'white',
  },
  notesCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 1,
    backgroundColor: 'white',
  },
  cardTitle: {
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  // Info List
  infoList: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '400',
  },
  // Action Grid
  actionGrid: {
    gap: 12,
  },
  actionButton: {
    borderRadius: 8,
  },
  primaryAction: {
    backgroundColor: '#11998e',
  },
  actionButtonContent: {
    paddingVertical: 4,
  },
  // Notes
  notesContent: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#6c757d',
  },
  // Client Cards
  clientCard: {
    marginBottom: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
})

export default ClientsScreen