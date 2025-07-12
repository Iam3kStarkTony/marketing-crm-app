import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { Card, Text, IconButton } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../../contexts/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'

interface TimeTrackerProps {
  loading?: boolean
}

const TimeTracker: React.FC<TimeTrackerProps> = ({ loading = false }) => {
  const { theme } = useTheme()
  const styles = createStyles(theme)
  
  // Gradient colors for TimeTracker - updated to match reference image
  const gradientColors = ['#1A8D1A', '#25A52A', '#2EBE35']
  
  const [isRunning, setIsRunning] = useState(false)
  const [time, setTime] = useState(5048) // Initial time in seconds (01:24:08)
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isRunning) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 1)
      }, 1000)
    } else if (interval) {
      clearInterval(interval)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning])
  
  const formatTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600)
    const minutes = Math.floor((timeInSeconds % 3600) / 60)
    const seconds = timeInSeconds % 60
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':')
  }
  
  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }
  
  const resetTimer = () => {
    setIsRunning(false)
    setTime(0)
  }
  
  return (
    <Card style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.content}
      >
        <Text style={styles.title}>Time Tracker</Text>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(time)}</Text>
          <View style={styles.buttonContainer}>
            <IconButton
              icon={isRunning ? 'pause' : 'play'}
              iconColor="white"
              size={24}
              style={styles.playButton}
              onPress={toggleTimer}
            />
            <IconButton
              icon="stop"
              iconColor="white"
              size={24}
              style={styles.stopButton}
              onPress={resetTimer}
            />
          </View>
        </View>
      </LinearGradient>
    </Card>
  )
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1, // Adjusted to align with Pending Projects
    borderRadius: 12,
    overflow: 'hidden',
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
  content: {
    padding: 16,
    height: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 36,
    fontWeight: '700',
    color: 'white',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  playButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    margin: 8,
  },
  stopButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    margin: 8,
  },
})

export default TimeTracker