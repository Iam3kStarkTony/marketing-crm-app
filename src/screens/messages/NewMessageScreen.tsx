import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import {
  Text,
  TextInput,
  Button,
  Card,
  List,
  Searchbar,
  Avatar,
  Chip,
  Divider,
  ActivityIndicator,
} from 'react-native-paper'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Client } from '../../types/database'

// Validation schema
const messageSchema = z.object({
  recipient_id: z.string().uuid('Please select a recipient'),
  content: z.string().min(1, 'Message content is required').max(1000, 'Message is too long'),
})

type MessageFormData = z.infer<typeof messageSchema>

interface NewMessageScreenProps {
  navigation: any
}

const NewMessageScreen: React.FC<NewMessageScreenProps> = ({ navigation }) => {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      recipient_id: '',
      content: '',
    },
  })

  const watchedRecipientId = watch('recipient_id')

  useEffect(() => {
    fetchClients()
  }, [])

  useEffect(() => {
    // Filter clients based on search query
    if (searchQuery.trim() === '') {
      setFilteredClients(clients)
    } else {
      const filtered = clients.filter(client =>
        client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.company && client.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredClients(filtered)
    }
  }, [searchQuery, clients])

  useEffect(() => {
    // Update selected client when recipient changes
    if (watchedRecipientId) {
      const client = clients.find(c => c.id === watchedRecipientId)
      setSelectedClient(client || null)
    } else {
      setSelectedClient(null)
    }
  }, [watchedRecipientId, clients])

  const fetchClients = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')
        .order('name')

      if (error) {
        console.error('Error fetching clients:', error)
        Alert.alert('Error', 'Failed to load clients.')
        return
      }

      setClients(data || [])
      setFilteredClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
      Alert.alert('Error', 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: MessageFormData) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated.')
      return
    }

    setSending(true)
    try {
      const messageData = {
        content: data.content.trim(),
        sender_id: user.id,
        recipient_id: data.recipient_id,
        conversation_id: `${user.id}-${data.recipient_id}`,
        message_type: 'text' as const,
      }

      const { error } = await supabase
        .from('messages')
        .insert([messageData])

      if (error) {
        console.error('Error sending message:', error)
        Alert.alert(
          'Send Failed',
          error.message || 'Failed to send message. Please try again.',
          [{ text: 'OK' }]
        )
        return
      }

      Alert.alert(
        'Success',
        'Message sent successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to the conversation
              navigation.replace('ConversationDetail', {
                clientId: data.recipient_id,
              })
            },
          },
        ]
      )
    } catch (error) {
      console.error('Error sending message:', error)
      Alert.alert(
        'Send Failed',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      )
    } finally {
      setSending(false)
    }
  }

  const handleClientSelect = (client: Client) => {
    setValue('recipient_id', client.id)
    setSearchQuery('')
  }

  const handleCancel = () => {
    navigation.goBack()
  }

  const clearSelectedClient = () => {
    setValue('recipient_id', '')
    setSelectedClient(null)
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.formCard}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              New Message
            </Text>

            <View style={styles.form}>
              {/* Recipient Selection */}
              <View style={styles.recipientSection}>
                <Text variant="bodyLarge" style={styles.fieldLabel}>
                  To: *
                </Text>
                
                {selectedClient ? (
                  <View style={styles.selectedClientContainer}>
                    <Chip
                      avatar={
                        <Avatar.Text
                          size={24}
                          label={selectedClient.full_name.charAt(0)}
                        />
                      }
                      onClose={clearSelectedClient}
                      style={styles.selectedClientChip}
                    >
                      {selectedClient.full_name}
                      {selectedClient.company && ` (${selectedClient.company})`}
                    </Chip>
                  </View>
                ) : (
                  <View style={styles.clientSelectionContainer}>
                    <Searchbar
                      placeholder="Search clients..."
                      onChangeText={setSearchQuery}
                      value={searchQuery}
                      style={styles.searchBar}
                      disabled={sending}
                    />
                    
                    {searchQuery.length > 0 && (
                      <Card style={styles.clientListCard}>
                        <ScrollView
                          style={styles.clientList}
                          nestedScrollEnabled
                          keyboardShouldPersistTaps="handled"
                        >
                          {filteredClients.length > 0 ? (
                            filteredClients.map((client, index) => (
                              <View key={client.id}>
                                <List.Item
                                  title={client.full_name}
                                  description={`${client.email}${client.company ? ` • ${client.company}` : ''}`}
                                  left={(props) => (
                                    <Avatar.Text
                                      {...props}
                                      size={40}
                                      label={client.full_name.charAt(0)}
                                    />
                                  )}
                                  onPress={() => handleClientSelect(client)}
                                  style={styles.clientListItem}
                                />
                                {index < filteredClients.length - 1 && <Divider />}
                              </View>
                            ))
                          ) : (
                            <View style={styles.noResultsContainer}>
                              <Text variant="bodyMedium" style={styles.noResultsText}>
                                No clients found matching "{searchQuery}"
                              </Text>
                            </View>
                          )}
                        </ScrollView>
                      </Card>
                    )}
                  </View>
                )}
                
                {errors.recipient_id && (
                  <Text style={styles.errorText}>
                    {errors.recipient_id.message}
                  </Text>
                )}
              </View>

              {/* Message Content */}
              <Controller
                control={control}
                name="content"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Message *"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      mode="outlined"
                      multiline
                      numberOfLines={6}
                      maxLength={1000}
                      error={!!errors.content}
                      disabled={sending}
                      placeholder="Type your message here..."
                      style={styles.messageInput}
                    />
                    <View style={styles.characterCount}>
                      <Text variant="bodySmall" style={styles.characterCountText}>
                        {value.length}/1000
                      </Text>
                    </View>
                    {errors.content && (
                      <Text style={styles.errorText}>
                        {errors.content.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <Button
                  mode="outlined"
                  onPress={handleCancel}
                  disabled={sending}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSubmit(onSubmit)}
                  loading={sending}
                  disabled={sending || !selectedClient}
                  style={styles.sendButton}
                  icon="send"
                >
                  Send Message
                </Button>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  formCard: {
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  fieldLabel: {
    marginBottom: 8,
    fontWeight: '500',
  },
  recipientSection: {
    marginBottom: 8,
  },
  selectedClientContainer: {
    marginBottom: 8,
  },
  selectedClientChip: {
    alignSelf: 'flex-start',
  },
  clientSelectionContainer: {
    position: 'relative',
  },
  searchBar: {
    marginBottom: 8,
  },
  clientListCard: {
    maxHeight: 200,
    elevation: 4,
  },
  clientList: {
    maxHeight: 200,
  },
  clientListItem: {
    paddingVertical: 8,
  },
  noResultsContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    marginBottom: 8,
  },
  messageInput: {
    minHeight: 120,
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  characterCountText: {
    color: '#666',
  },
  errorText: {
    color: '#B00020',
    fontSize: 12,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  sendButton: {
    flex: 1,
  },
})

export default NewMessageScreen