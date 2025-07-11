import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native'
import {
  Text,
  Card,
  Avatar,
  Button,
  Chip,
  Divider,
  List,
  ActivityIndicator,
  FAB,
} from 'react-native-paper'
import { useRoute, useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { Client } from '../../types/database'
import { useCallback } from 'react'

interface ClientDetailScreenProps {
  navigation: any
}

const ClientDetailScreen: React.FC<ClientDetailScreenProps> = ({ navigation }) => {
  const route = useRoute()
  const { clientId } = route.params as { clientId: string }
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchClient = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (error) {
        console.error('Error fetching client:', error)
        Alert.alert('Error', 'Failed to load client details.')
        navigation.goBack()
        return
      }

      setClient(data)
    } catch (error) {
      console.error('Error fetching client:', error)
      Alert.alert('Error', 'An unexpected error occurred.')
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchClient()
    }, [clientId])
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4CAF50'
      case 'inactive':
        return '#FF9800'
      case 'prospect':
        return '#2196F3'
      default:
        return '#757575'
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

  const handleEdit = () => {
    navigation.navigate('AddEditClient', { clientId: client?.id })
  }

  const handleCreateTask = () => {
    navigation.navigate('AddEditTask', { clientId: client?.id })
  }

  const handleSendMessage = () => {
    navigation.navigate('Conversation', { 
      clientId: client?.id,
      clientName: client?.name 
    })
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading client details...</Text>
      </View>
    )
  }

  if (!client) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Client not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Client Header */}
        <Card style={styles.headerCard}>
          <Card.Content style={styles.headerContent}>
            <Avatar.Text
              size={80}
              label={client.full_name.substring(0, 2).toUpperCase()}
              style={[styles.avatar, { backgroundColor: getStatusColor(client.status) }]}
            />
            <View style={styles.headerInfo}>
              <Text variant="headlineSmall" style={styles.clientName}>
                {client.full_name}
              </Text>
              {client.company && (
                <Text variant="titleMedium" style={styles.company}>
                  {client.company}
                </Text>
              )}
              <Chip
                mode="outlined"
                textStyle={[styles.statusText, { color: getStatusColor(client.status) }]}
                style={[styles.statusChip, { borderColor: getStatusColor(client.status) }]}
              >
                {getStatusLabel(client.status)}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Contact Information */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Contact Information
            </Text>
            
            <List.Item
              title="Email"
              description={client.email}
              left={props => <List.Icon {...props} icon="email" />}
              onPress={() => {/* Handle email */}}
            />
            
            {client.phone && (
              <>
                <Divider />
                <List.Item
                  title="Phone"
                  description={client.phone}
                  left={props => <List.Icon {...props} icon="phone" />}
                  onPress={() => {/* Handle phone call */}}
                />
              </>
            )}
            
            {client.address && (
              <>
                <Divider />
                <List.Item
                  title="Address"
                  description={client.address}
                  left={props => <List.Icon {...props} icon="map-marker" />}
                  onPress={() => {/* Handle address */}}
                />
              </>
            )}
          </Card.Content>
        </Card>

        {/* Additional Information */}
        {client.notes && (
          <Card style={styles.notesCard}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Notes
              </Text>
              <Text variant="bodyMedium" style={styles.notes}>
                {client.notes}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Quick Actions */}
        <Card style={styles.actionsCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Quick Actions
            </Text>
            
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                icon="message"
                onPress={handleSendMessage}
                style={styles.actionButton}
              >
                Send Message
              </Button>
              
              <Button
                mode="outlined"
                icon="plus"
                onPress={handleCreateTask}
                style={styles.actionButton}
              >
                Create Task
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Client Stats */}
        <Card style={styles.statsCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Statistics
            </Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text variant="headlineSmall" style={styles.statNumber}>0</Text>
                <Text variant="bodyMedium" style={styles.statLabel}>Active Tasks</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text variant="headlineSmall" style={styles.statNumber}>0</Text>
                <Text variant="bodyMedium" style={styles.statLabel}>Messages</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text variant="headlineSmall" style={styles.statNumber}>0</Text>
                <Text variant="bodyMedium" style={styles.statLabel}>Completed Tasks</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <FAB
        icon="pencil"
        style={styles.fab}
        onPress={handleEdit}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  headerCard: {
    marginBottom: 16,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatar: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  clientName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  company: {
    color: '#666',
    marginBottom: 8,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoCard: {
    marginBottom: 16,
    elevation: 2,
  },
  notesCard: {
    marginBottom: 16,
    elevation: 2,
  },
  actionsCard: {
    marginBottom: 16,
    elevation: 2,
  },
  statsCard: {
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  notes: {
    lineHeight: 20,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    color: '#666',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
})

export default ClientDetailScreen