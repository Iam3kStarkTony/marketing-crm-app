import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Card, Text, ActivityIndicator } from 'react-native-paper'
import { useTheme } from '../../../contexts/ThemeContext'
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg'

interface ProjectProgressProps {
  loading?: boolean
}

const ProjectProgress: React.FC<ProjectProgressProps> = ({ loading = false }) => {
  const { theme } = useTheme()
  const styles = createStyles(theme)

  // Mock data
  const progressPercentage = 41
  const status = 'Project Ended'

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  const size = 180
  const strokeWidth = 15
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progress = (progressPercentage / 100) * circumference

  return (
    <Card style={styles.container}>
      <Card.Content>
        <Text style={styles.title}>Project Progress</Text>
        <View style={styles.progressContainer}>
          <Svg width={size} height={size} style={styles.progressCircle}>
            {/* Background Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#f0f0f0"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#4CAF50"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              strokeLinecap="round"
              fill="transparent"
              transform={`rotate(-90, ${size / 2}, ${size / 2})`}
            />
            <SvgText
              x={size / 2}
              y={size / 2 + 5}
              textAnchor="middle"
              fontSize="24"
              fontWeight="bold"
              fill={theme.colors.onSurface}
            >
              {progressPercentage}%
            </SvgText>
            <SvgText
              x={size / 2}
              y={size / 2 + 30}
              textAnchor="middle"
              fontSize="12"
              fill={theme.colors.onSurfaceVariant}
            >
              {status}
            </SvgText>
          </Svg>
        </View>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Completed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#3D6E2E' }]} />
            <Text style={styles.legendText}>In Progress</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#F5F5F5' }]} />
            <Text style={styles.legendText}>Pending</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  )
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    marginLeft: 8,
    marginBottom: 16,
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
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: theme.colors.onSurface,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  progressCircle: {
    marginVertical: 10,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default ProjectProgress