import React from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import { Card, Text } from 'react-native-paper'
import { BarChart } from 'react-native-chart-kit'
import { useTheme } from '../../../contexts/ThemeContext'

interface ProjectAnalyticsProps {
  loading?: boolean
}

const { width: screenWidth } = Dimensions.get('window')
const chartWidth = screenWidth - 64 // Account for margins

const ProjectAnalytics: React.FC<ProjectAnalyticsProps> = ({ loading = false }) => {
  const { theme } = useTheme()
  const styles = createStyles(theme)

  // Mock data for project analytics
  const data = {
    labels: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    datasets: [
      {
        data: [20, 45, 28, 80, 99, 43, 50],
      },
    ],
  }

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(45, 90, 39, ${opacity})`, // Green color with opacity
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    barPercentage: 0.4,
    propsForBackgroundLines: {
      strokeWidth: 1,
      stroke: '#e3e3e3',
      strokeDasharray: '0',
    },
  }

  return (
    <Card style={styles.container}>
      <Card.Content>
        <Text style={styles.title}>Project Analytics</Text>
        <View style={styles.chartContainer}>
          <BarChart
            data={data}
            width={chartWidth - 16}
            height={200}
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero
            showBarTops={false}
            withInnerLines={true}
            segments={4}
            yAxisInterval={1}
          />
        </View>
      </Card.Content>
    </Card>
  )
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 2,
    marginRight: 8,
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
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
})

export default ProjectAnalytics