import React from 'react'
import {
  View,
  StyleSheet,
} from 'react-native'
import {
  Text,
  Card,
} from 'react-native-paper'
import { useTheme } from '../contexts/ThemeContext'

interface HelpScreenProps {
  navigation: any
}

const HelpScreen: React.FC<HelpScreenProps> = ({ navigation }) => {
  const { theme } = useTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Help & Support</Text>
          <Text style={styles.subtitle}>
            Help and support functionality will be implemented here.
          </Text>
        </Card.Content>
      </Card>
    </View>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
      padding: 16,
    },
    card: {
      backgroundColor: theme.colors.surface,
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
    },
  })

export default HelpScreen