import React from 'react'
import { Platform, View } from 'react-native'
import { TextInput } from 'react-native-paper'
import DateTimePicker from '@react-native-community/datetimepicker'

interface CrossPlatformDatePickerProps {
  value: Date | undefined
  onChange: (event: any, selectedDate?: Date) => void
  minimumDate?: Date
  maximumDate?: Date
  mode?: 'date' | 'time' | 'datetime'
  display?: 'default' | 'spinner' | 'compact'
  disabled?: boolean
  label?: string
  style?: any
}

const CrossPlatformDatePicker: React.FC<CrossPlatformDatePickerProps> = ({
  value,
  onChange,
  minimumDate,
  maximumDate,
  mode = 'date',
  display = 'default',
  disabled = false,
  label = 'Select Date',
  style,
}) => {
  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return ''
    return date.toISOString().split('T')[0] // Format as YYYY-MM-DD for HTML input
  }

  const handleWebDateChange = (dateString: string) => {
    if (dateString) {
      const selectedDate = new Date(dateString)
      onChange(null, selectedDate)
    } else {
      onChange(null, undefined)
    }
  }

  if (Platform.OS === 'web') {
    return (
      <View style={style}>
        <input
          type="date"
          value={value ? formatDateForInput(value) : ''}
          onChange={(e) => handleWebDateChange(e.target.value)}
          min={minimumDate ? formatDateForInput(minimumDate) : undefined}
          max={maximumDate ? formatDateForInput(maximumDate) : undefined}
          disabled={disabled}
          placeholder={label}
          style={{
            width: '100%',
            padding: '16px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px',
            backgroundColor: disabled ? '#f5f5f5' : 'white',
            fontFamily: 'inherit',
          }}
        />
      </View>
    )
  }

  // For mobile platforms (iOS/Android)
  return (
    <DateTimePicker
      value={value || new Date()}
      mode={mode}
      display={display}
      onChange={onChange}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      disabled={disabled}
      style={style}
    />
  )
}

export default CrossPlatformDatePicker