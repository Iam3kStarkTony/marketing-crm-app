import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
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
} from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
// import { LinearGradient } from 'expo-linear-gradient' // Temporarily disabled
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { Profile } from '../../types/database'
import { spacing, shadows } from '../../config/theme'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

interface TeamManagementScreenProps {
  navigation: any
}

type TeamFilter = 'all' | 'admin' | 'manager' | 'agent'
type SortOption = 'name' | 'role' | 'created_at'

const TeamManagementScreen: React.FC<TeamManagementScreenProps> = ({ navigation }) => {
  const { theme } = useTheme()
  const { user } = useAuth()
  const styles = createStyles(theme)
  const [teamMembers, setTeamMembers] = useState<Profile[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<TeamFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [menuVisible, setMenuVisible] = useState(false)

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order(sortBy === 'name' ? 'full_name' : sortBy, {
          ascending: sortBy === 'name',
        })

      if (error) {
        console.error('Error fetching team members:', error)
        Alert.alert('Error', 'Failed to load team members. Please try again.')
        return
      }

      setTeamMembers(data || [])
    } catch (error) {
      console.error('Error fetching team members:', error)
      Alert.alert('Error', 'An unexpected error occurred.')
    }
  }

  const applyFiltersAndSearch = useCallback(() => {
    let filtered = [...teamMembers]

    // Apply role filter
    if (filter !== 'all') {
      filtered = filtered.filter(member => member.role === filter)
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(member =>
        member.full_name?.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.department?.toLowerCase().includes(query)
      )
    }

    setFilteredMembers(filtered)
  }, [teamMembers, filter, searchQuery])

  useFocusEffect(
    useCallback(() => {
      loadTeamMembers()
    }, [])
  )

  useEffect(() => {
    applyFiltersAndSearch()
  }, [applyFiltersAndSearch])

  const loadTeamMembers = async () => {
    setLoading(true)
    await fetchTeamMembers()
    setLoading(false)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchTeamMembers()
    setRefreshing(false)
  }

  const navigateToAddTeamMember = () => {
    navigation.navigate('AddTeamMember')
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#e74c3c' // Red for admin
      case 'manager':
        return '#f39c12' // Orange for manager
      case 'agent':
        return theme.colors.primary // Primary color for agent
      default:
        return theme.colors.outline
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin'
      case 'manager':
        return 'Manager'
      case 'agent':
        return 'Agent'
      default:
        return role
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return 'shield-crown'
      case 'manager':
        return 'account-tie'
      case 'agent':
        return 'account'
      default:
        return 'account'
    }
  }

  const renderTeamMember = ({ item }: { item: Profile }) => {
    return (
      <Card style={styles.memberCard}>
        <Card.Content style={styles.memberContent}>
            <View style={styles.memberHeader}>
              <Avatar.Text
                size={52}
                label={(item.full_name || item.email).substring(0, 2).toUpperCase()}
                style={[styles.avatar, { backgroundColor: getRoleColor(item.role) }]}
              />
              <View style={styles.memberInfo}>
                <Text variant="titleMedium" style={styles.memberName}>
                  {item.full_name || 'No Name'}
                </Text>
                {item.department && (
                  <Text variant="bodyMedium" style={styles.department}>
                    🏢 {item.department}
                  </Text>
                )}
                <Text variant="bodySmall" style={styles.email}>
                  ✉️ {item.email}
                </Text>
                {item.phone && (
                  <Text variant="bodySmall" style={styles.phone}>
                    📞 {item.phone}
                  </Text>
                )}
              </View>
              <View style={styles.roleContainer}>
                <Chip
                  mode="flat"
                  icon={getRoleIcon(item.role)}
                  textStyle={[styles.roleText, { color: 'white' }]}
                  style={[styles.roleChip, { backgroundColor: getRoleColor(item.role) }]}
                >
                  {getRoleLabel(item.role)}
                </Chip>
              </View>
            </View>
           </Card.Content>
       </Card>
    )
  }

  const renderFilterChips = () => {
    const filters: { key: TeamFilter; label: string; icon: string }[] = [
      { key: 'all', label: 'All', icon: 'account-group' },
      { key: 'admin', label: 'Admins', icon: 'shield-crown' },
      { key: 'manager', label: 'Managers', icon: 'account-tie' },
      { key: 'agent', label: 'Agents', icon: 'account' },
    ]

    return (
      <View style={styles.filterContainer}>
        {filters.map(filterItem => (
          <Chip
            key={filterItem.key}
            mode={filter === filterItem.key ? 'flat' : 'outlined'}
            selected={filter === filterItem.key}
            onPress={() => setFilter(filterItem.key)}
            icon={filterItem.icon}
            style={styles.filterChip}
          >
            {filterItem.label}
          </Chip>
        ))}
      </View>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="account-group-outline"
        size={64}
        color={theme.colors.outline}
      />
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        No Team Members Found
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        {searchQuery || filter !== 'all'
          ? 'Try adjusting your search or filters'
          : 'Add your first team member to get started'}
      </Text>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading team members...
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>Team Management</Title>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <Searchbar
        placeholder="Search team members..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        icon="account-search"
      />

      {renderFilterChips()}

      <FlatList
        data={filteredMembers}
        renderItem={renderTeamMember}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="plus"
        label="Add Member"
        style={styles.fab}
        onPress={navigateToAddTeamMember}
      />
    </View>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: spacing.lg,
      paddingBottom: spacing.md,
    },
    title: {
      color: theme.colors.onBackground,
      marginBottom: spacing.xs,
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
    },
    searchbar: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      elevation: 2,
    },
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      gap: spacing.sm,
    },
    filterChip: {
      marginRight: spacing.xs,
    },
    listContainer: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 100, // Space for FAB
    },
    memberCard: {
      marginBottom: spacing.md,
      elevation: 2,
      ...shadows.small,
    },
    memberGradient: {
      borderRadius: 12,
    },
    memberContent: {
      padding: spacing.md,
    },
    memberHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      marginRight: spacing.md,
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: spacing.xs,
    },
    department: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: spacing.xs,
    },
    email: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: spacing.xs,
    },
    phone: {
      color: theme.colors.onSurfaceVariant,
    },
    roleContainer: {
      alignItems: 'flex-end',
    },
    roleChip: {
      elevation: 1,
    },
    roleText: {
      fontSize: 12,
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.xl * 2,
    },
    emptyTitle: {
      color: theme.colors.onSurface,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    emptySubtitle: {
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      marginTop: spacing.lg,
      color: theme.colors.onSurfaceVariant,
    },
    fab: {
      position: 'absolute',
      margin: spacing.lg,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.primary,
    },
  })

export default TeamManagementScreen