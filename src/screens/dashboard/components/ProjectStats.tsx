import React, { useState, useEffect } from 'react'
import { View, StyleSheet, Dimensions, ScrollView, ActivityIndicator } from 'react-native'
import { Card, Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../../contexts/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../../../contexts/AuthContext'
import { projectStatsService, ProjectStats as ProjectStatsType } from '../../../services/projectStatsService'

interface ProjectStatsProps {
  loading?: boolean
}

const { width: screenWidth } = Dimensions.get('window')

const ProjectStats: React.FC<ProjectStatsProps> = ({ loading = false }) => {
  const { theme } = useTheme()
  const { user } = useAuth()
  const styles = createStyles(theme)
  const [statsLoading, setStatsLoading] = useState(true)
  const [projectStats, setProjectStats] = useState<ProjectStatsType | null>(null)

  useEffect(() => {
    const loadProjectStats = async () => {
      if (!user) return
      
      try {
        setStatsLoading(true)
        const stats = await projectStatsService.fetchProjectStatsWithRetry(user.id)
        setProjectStats(stats)
      } catch (error) {
        console.error('Error loading project stats:', error)
      } finally {
        setStatsLoading(false)
      }
    }

    loadProjectStats()
  }, [user])

  // Generate stats data from real data
  const statsData = [
    {
      title: 'Total Projects',
      value: projectStats?.total || 0,
      icon: 'folder-multiple-outline',
      color: '#2D5A27', // Green
      change: projectStats?.totalChange && projectStats.totalChange > 0 
        ? `Increased by ${projectStats.totalChange}% from last month`
        : projectStats?.totalChange && projectStats.totalChange < 0
        ? `Decreased by ${Math.abs(projectStats.totalChange)}% from last month`
        : 'No change from last month',
      changeType: projectStats?.totalChange && projectStats.totalChange > 0 
        ? 'increase' as const 
        : projectStats?.totalChange && projectStats.totalChange < 0 
        ? 'decrease' as const 
        : 'neutral' as const,
    },
    {
      title: 'Ended Projects',
      value: projectStats?.ended || 0,
      icon: 'folder-check-outline',
      color: '#2196F3', // Blue
      change: projectStats?.endedChange && projectStats.endedChange > 0 
        ? `Increased by ${projectStats.endedChange}% from last month`
        : projectStats?.endedChange && projectStats.endedChange < 0
        ? `Decreased by ${Math.abs(projectStats.endedChange)}% from last month`
        : 'No change from last month',
      changeType: projectStats?.endedChange && projectStats.endedChange > 0 
        ? 'increase' as const 
        : projectStats?.endedChange && projectStats.endedChange < 0 
        ? 'decrease' as const 
        : 'neutral' as const,
    },
    {
      title: 'Running Projects',
      value: projectStats?.running || 0,
      icon: 'folder-play-outline',
      color: '#FF9800', // Orange
      change: projectStats?.runningChange && projectStats.runningChange > 0 
        ? `Increased by ${projectStats.runningChange}% from last month`
        : projectStats?.runningChange && projectStats.runningChange < 0
        ? `Decreased by ${Math.abs(projectStats.runningChange)}% from last month`
        : 'No change from last month',
      changeType: projectStats?.runningChange && projectStats.runningChange > 0 
        ? 'increase' as const 
        : projectStats?.runningChange && projectStats.runningChange < 0 
        ? 'decrease' as const 
        : 'neutral' as const,
    },
    {
      title: 'Pending Projects',
      value: projectStats?.pending || 0,
      icon: 'folder-clock-outline',
      color: '#F44336', // Red
      change: projectStats?.pendingChange && projectStats.pendingChange > 0 
        ? `Increased by ${projectStats.pendingChange}% from last month`
        : projectStats?.pendingChange && projectStats.pendingChange < 0
        ? `Decreased by ${Math.abs(projectStats.pendingChange)}% from last month`
        : 'No change from last month',
      changeType: projectStats?.pendingChange && projectStats.pendingChange > 0 
        ? 'increase' as const 
        : projectStats?.pendingChange && projectStats.pendingChange < 0 
        ? 'decrease' as const 
        : 'neutral' as const,
    },
  ]

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        {statsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading project stats...</Text>
          </View>
        ) : statsData.map((stat, index) => {
          const isLastCard = index === statsData.length - 1;
          return (
            <Card 
              key={stat.title} 
              style={[styles.statCard, isLastCard && styles.lastCard]}
              onPress={() => console.log(`${stat.title} pressed`)}
            >
              {stat.title === 'Total Projects' ? (
                <LinearGradient
                  colors={['#1A8D1A', '#25A52A', '#2EBE35']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientContainer}
                >
                  <View style={styles.statCardContent}>
                    <View style={styles.statHeader}>
                      <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <MaterialCommunityIcons 
                          name={stat.icon as any} 
                          size={24} 
                          color={'white'} 
                        />
                      </View>
                      {stat.change && (
                        <Text style={[styles.changeText, { color: 'rgba(255,255,255,0.8)' }]}>
                          {stat.change}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.statValue, styles.whiteText]}>{stat.value}</Text>
                    <Text style={[styles.statTitle, styles.whiteText]}>{stat.title}</Text>
                  </View>
                </LinearGradient>
              ) : (
                <Card.Content style={styles.statCardContent}>
                  <View style={styles.statHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: `${stat.color}20` }]}>
                      <MaterialCommunityIcons 
                        name={stat.icon as any} 
                        size={24} 
                        color={stat.color} 
                      />
                    </View>
                    {stat.change && (
                      <Text style={[styles.changeText, { color: theme.colors.onSurfaceVariant }]}>
                        {stat.change}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statTitle}>{stat.title}</Text>
                </Card.Content>
              )}
            </Card>
          );
        })}
      </View>
    </View>
  )
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    width: '100%',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: 150, // Ensure consistent height during loading
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
  },
  statCard: {
    flex: 1,
    marginRight: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    overflow: 'hidden', // Ensure gradient stays within card bounds
  },
  lastCard: {
    marginRight: 0,
  },
  statCardContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  gradientContainer: {
    padding: 16,
    borderRadius: 12,
    height: '100%',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  whiteText: {
    color: 'white',
  },
})

export default ProjectStats