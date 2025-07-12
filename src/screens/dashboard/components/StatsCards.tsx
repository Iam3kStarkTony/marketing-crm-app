import React from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import { Card, Text, ActivityIndicator, IconButton } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../../contexts/ThemeContext'
import { TaskStats } from '../../../services/taskStatsService'

interface StatsCardsProps {
  taskStats: TaskStats | null
  loading: boolean
  onRefresh?: () => void
}

interface StatsCardProps {
  title: string
  value: number
  change: number
  icon: string
  color: string
  loading?: boolean
}

const { width: screenWidth } = Dimensions.get('window')
const cardWidth = (screenWidth - 48) / 2 // 2 cards per row with margins

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  color, 
  loading = false 
}) => {
  const { theme } = useTheme()
  const styles = createStyles(theme)

  const getChangeColor = () => {
    if (change > 0) return '#4CAF50' // Green for positive
    if (change < 0) return '#F44336' // Red for negative
    return theme.colors.onSurfaceVariant // Gray for no change
  }

  const getChangeIcon = () => {
    if (change > 0) return 'trending-up'
    if (change < 0) return 'trending-down'
    return 'trending-neutral'
  }

  return (
    <Card style={[styles.statsCard, { width: cardWidth }]}>
      <Card.Content style={styles.statsCardContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.statsHeader}>
              <MaterialCommunityIcons 
                name={icon as any} 
                size={24} 
                color={color} 
              />
              <View style={[styles.changeContainer, { backgroundColor: getChangeColor() + '20' }]}>
                <MaterialCommunityIcons 
                  name={getChangeIcon() as any} 
                  size={12} 
                  color={getChangeColor()} 
                />
                <Text style={[styles.changeText, { color: getChangeColor() }]}>
                  {change > 0 ? '+' : ''}{change}%
                </Text>
              </View>
            </View>
            
            <Text style={styles.statsValue}>{value.toLocaleString()}</Text>
            <Text style={styles.statsTitle}>{title}</Text>
          </>
        )}
      </Card.Content>
    </Card>
  )
}

const StatsCards: React.FC<StatsCardsProps> = ({ taskStats, loading, onRefresh }) => {
  const { theme } = useTheme()
  const styles = createStyles(theme)

  const statsData = [
    {
      title: 'Total Tasks',
      value: taskStats?.total || 0,
      change: taskStats?.totalChange || 0,
      icon: 'clipboard-list-outline',
      color: '#2196F3', // Blue
    },
    {
      title: 'Completed Tasks',
      value: taskStats?.completed || 0,
      change: taskStats?.completedChange || 0,
      icon: 'check-circle-outline',
      color: '#4CAF50', // Green
    },
    {
      title: 'In Progress',
      value: taskStats?.inProgress || 0,
      change: taskStats?.inProgressChange || 0,
      icon: 'clock-outline',
      color: '#FF9800', // Orange
    },
    {
      title: 'Pending Tasks',
      value: taskStats?.pending || 0,
      change: taskStats?.pendingChange || 0,
      icon: 'pause-circle-outline',
      color: '#F44336', // Red
    },
  ]

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Task Statistics</Text>
        {onRefresh && (
          <IconButton 
            icon="refresh" 
            size={20} 
            onPress={onRefresh}
            iconColor={theme.colors.onSurfaceVariant}
          />
        )}
      </View>
      
      <View style={styles.statsContainer}>
        {statsData.map((stat, index) => (
          <StatsCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            icon={stat.icon}
            color={stat.color}
            loading={loading}
          />
        ))}
      </View>
    </View>
  )
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    margin: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsCard: {
    marginBottom: 12,
    elevation: 2,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  statsCardContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  loadingContainer: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  changeText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  statsTitle: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
})

export default StatsCards