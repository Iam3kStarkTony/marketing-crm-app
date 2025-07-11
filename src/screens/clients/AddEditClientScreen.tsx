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
  HelperText,
  SegmentedButtons,
} from 'react-native-paper'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRoute } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { N8nIntegrationService } from '../../services/n8nIntegration'
import { useAuth } from '../../contexts/AuthContext'
import { Client, ClientFormData } from '../../types/database'

// Validation schema
const clientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'prospect']),
})

type ClientFormDataType = z.infer<typeof clientSchema>

interface AddEditClientScreenProps {
  navigation: any
}

const AddEditClientScreen: React.FC<AddEditClientScreenProps> = ({ navigation }) => {
  const route = useRoute()
  const { clientId } = (route.params as { clientId?: string }) || {}
  const isEditing = !!clientId
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEditing)

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ClientFormDataType>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      notes: '',
      status: 'prospect',
    },
  })

  useEffect(() => {
    if (isEditing) {
      fetchClient()
    }
  }, [clientId])

  const fetchClient = async () => {
    if (!clientId) return

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

      reset({
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        company: data.company || '',
        address: data.address || '',
        notes: data.notes || '',
        status: data.status,
      })
    } catch (error) {
      console.error('Error fetching client:', error)
      Alert.alert('Error', 'An unexpected error occurred.')
      navigation.goBack()
    } finally {
      setInitialLoading(false)
    }
  }

  const onSubmit = async (data: ClientFormDataType) => {
    setLoading(true)
    try {
      if (isEditing) {
        // Update existing client
        const { error } = await supabase
          .from('clients')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', clientId)

        if (error) {
          console.error('Error updating client:', error)
          Alert.alert(
            'Update Failed',
            error.message || 'Failed to update client. Please try again.',
            [{ text: 'OK' }]
          )
          return
        }

        Alert.alert(
          'Success',
          'Client updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        )
      } else {
        // Create new client via n8n workflow
        if (!user) {
          Alert.alert('Error', 'User not authenticated')
          return
        }

        try {
          const clientData = {
            ...data,
            created_by: user.id,
            assigned_to: user.id // Default assign to creator
          }

          const result = await N8nIntegrationService.createClient(clientData)
          
          Alert.alert(
            'Success',
            'Client created successfully! Welcome email has been sent.',
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ]
          )
        } catch (error: any) {
          console.error('Error creating client via n8n:', error)
          Alert.alert(
            'Creation Failed',
            error.message || 'Failed to create client. Please try again.',
            [{ text: 'OK' }]
          )
          return
        }
      }
    } catch (error) {
      console.error('Error saving client:', error)
      Alert.alert(
        'Save Failed',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      )
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigation.goBack()
  }

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading client details...</Text>
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
              {isEditing ? 'Edit Client' : 'Add New Client'}
            </Text>

            <View style={styles.form}>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Full Name *"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      mode="outlined"
                      error={!!errors.name}
                      disabled={loading}
                      left={<TextInput.Icon icon="account" />}
                      style={styles.textInput}
                      contentStyle={styles.textInputContent}
                    />
                    <HelperText type="error" visible={!!errors.name}>
                      {errors.name?.message}
                    </HelperText>
                  </View>
                )}
              />

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Email Address *"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      mode="outlined"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      error={!!errors.email}
                      disabled={loading}
                      left={<TextInput.Icon icon="email" />}
                      style={styles.textInput}
                      contentStyle={styles.textInputContent}
                    />
                    <HelperText type="error" visible={!!errors.email}>
                      {errors.email?.message}
                    </HelperText>
                  </View>
                )}
              />

              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Phone Number"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      mode="outlined"
                      keyboardType="phone-pad"
                      disabled={loading}
                      left={<TextInput.Icon icon="phone" />}
                      style={styles.textInput}
                      contentStyle={styles.textInputContent}
                    />
                  </View>
                )}
              />

              <Controller
                control={control}
                name="company"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Company"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      mode="outlined"
                      disabled={loading}
                      left={<TextInput.Icon icon="office-building" />}
                      style={styles.textInput}
                      contentStyle={styles.textInputContent}
                    />
                  </View>
                )}
              />

              <Controller
                control={control}
                name="address"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Address"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      mode="outlined"
                      multiline
                      numberOfLines={2}
                      disabled={loading}
                      left={<TextInput.Icon icon="map-marker" />}
                      style={styles.textInput}
                      contentStyle={styles.textInputContent}
                    />
                  </View>
                )}
              />

              <Controller
                control={control}
                name="status"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.inputContainer}>
                    <Text variant="bodyLarge" style={styles.fieldLabel}>
                      Status *
                    </Text>
                    <View style={styles.segmentedButtonsContainer}>
                      <SegmentedButtons
                        value={value}
                        onValueChange={onChange}
                        buttons={[
                          {
                            value: 'prospect',
                            label: 'Prospect',
                            icon: 'account-search',
                          },
                          {
                            value: 'active',
                            label: 'Active',
                            icon: 'account-check',
                          },
                          {
                            value: 'inactive',
                            label: 'Inactive',
                            icon: 'account-off',
                          },
                        ]}
                        disabled={loading}
                        style={styles.segmentedButtons}
                      />
                    </View>
                  </View>
                )}
              />

              <Controller
                control={control}
                name="notes"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Notes"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      mode="outlined"
                      multiline
                      numberOfLines={4}
                      disabled={loading}
                      left={<TextInput.Icon icon="note-text" />}
                      style={styles.textInput}
                      contentStyle={styles.textInputContent}
                    />
                  </View>
                )}
              />

              <View style={styles.buttonRow}>
                <Button
                  mode="outlined"
                  onPress={handleCancel}
                  disabled={loading}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSubmit(onSubmit)}
                  loading={loading}
                  disabled={loading}
                  style={styles.saveButton}
                >
                  {isEditing ? 'Update Client' : 'Create Client'}
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
    backgroundColor: 'white',
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  formCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginHorizontal: 4,
  },
  title: {
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
    color: '#212529',
    fontSize: 24,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 12,
  },
  textInputContent: {
    backgroundColor: 'white',
  },
  segmentedButtonsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
  },
  segmentedButtons: {
    backgroundColor: 'transparent',
  },
  fieldLabel: {
    marginBottom: 12,
    fontWeight: '600',
    color: '#212529',
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 4,
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 4,
    backgroundColor: '#11998e',
  },
})

export default AddEditClientScreen