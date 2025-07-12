import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Card, Text, Button } from 'react-native-paper'
import { useTheme } from '../../../contexts/ThemeContext'

interface RemindersProps {
  loading?: boolean
}

const Reminders: React.FC<RemindersProps> = ({ loading = false }) => {
  const { theme } = useTheme()
  const styles = createStyles(theme)

  // Mock data for reminders
  const reminderData = {
    title: 'Meeting with Arc Company',
    time: '02:00 pm - 04:00 pm',
  }

  const handleStartMeeting = () => {
    // Handle meeting start logic
    console.log('Starting meeting with Arc Company')
  }

  return (
    <Card style={styles.container}>
      <Card.Content>
        <Text style={styles.title}>Reminders</Text>
        <View style={styles.reminderCard}>
          <Text style={styles.reminderTitle}>{reminderData.title}</Text>
          <Text style={styles.reminderTime}>Time: {reminderData.time}</Text>
          <Button 
            mode="contained" 
            style={styles.startButton}
            labelStyle={styles.buttonLabel}
            onPress={handleStartMeeting}
          >
            Start Meeting
          </Button>
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
    backgroundColor: theme.colors.surface,
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
  reminderCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  reminderTime: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 16,
  },
  startButton: {
    backgroundColor: '#1A8D1A', // Darker green color to match the reference
    borderRadius: 20, // More rounded corners
    marginTop: 8,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
})

export default Reminders