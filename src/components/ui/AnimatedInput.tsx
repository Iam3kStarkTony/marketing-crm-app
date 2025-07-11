import React, { useState, useRef } from 'react'
import { View, StyleSheet, TextInput as RNTextInput, ViewStyle, TextStyle } from 'react-native'
import { Text, TextInput, HelperText } from 'react-native-paper'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  interpolate,
} from 'react-native-reanimated'
import { useTheme } from '../../contexts/ThemeContext'
import { spacing, borderRadius, animations } from '../../config/theme'

interface AnimatedInputProps {
  label: string
  value: string
  onChangeText: (text: string) => void
  onBlur?: () => void
  onFocus?: () => void
  placeholder?: string
  error?: boolean
  errorMessage?: string
  helperText?: string
  disabled?: boolean
  multiline?: boolean
  numberOfLines?: number
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url'
  secureTextEntry?: boolean
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  autoComplete?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  style?: ViewStyle
  inputStyle?: TextStyle
  variant?: 'outlined' | 'filled'
}

export default function AnimatedInput({ 
  label,
  value,
  onChangeText,
  onBlur,
  onFocus,
  placeholder,
  error = false,
  errorMessage,
  helperText,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  autoComplete,
  leftIcon,
  rightIcon,
  style,
  inputStyle,
  variant = 'outlined',
}: AnimatedInputProps) {
  const { theme } = useTheme()
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<RNTextInput>(null)

  // Animated values
  const focusAnimation = useSharedValue(0)
  const borderAnimation = useSharedValue(0)
  const scaleAnimation = useSharedValue(1)

  const handleFocus = () => {
    setIsFocused(true)
    focusAnimation.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    })
    borderAnimation.value = withTiming(1, {
      duration: animations.timing.normal,
    })
    scaleAnimation.value = withSpring(1.02, {
      damping: 15,
      stiffness: 300,
    })
    onFocus?.()
  }

  const handleBlur = () => {
    setIsFocused(false)
    focusAnimation.value = withSpring(0, {
      damping: 15,
      stiffness: 300,
    })
    borderAnimation.value = withTiming(0, {
      duration: animations.timing.normal,
    })
    scaleAnimation.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    })
    onBlur?.()
  }

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleAnimation.value }],
    }
  })

  const borderAnimatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      borderAnimation.value,
      [0, 1],
      [error ? theme.colors.error : theme.colors.outline, theme.colors.primary]
    )

    const borderWidth = interpolate(
      borderAnimation.value,
      [0, 1],
      [1, 2]
    )

    return {
      borderColor,
      borderWidth,
    }
  })

  const labelAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      focusAnimation.value,
      [0, 1],
      [0, -8]
    )

    const scale = interpolate(
      focusAnimation.value,
      [0, 1],
      [1, 0.85]
    )

    const color = interpolateColor(
      focusAnimation.value,
      [0, 1],
      [error ? theme.colors.error : theme.colors.onSurfaceVariant, theme.colors.primary]
    )

    return {
      transform: [
        { translateY },
        { scale },
      ],
      color,
    }
  })

  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      marginVertical: spacing.sm,
    }

    return baseStyle
  }

  const getInputContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: borderRadius.md,
      backgroundColor: variant === 'filled' ? theme.colors.surfaceVariant : 'transparent',
      flexDirection: 'row',
      alignItems: multiline ? 'flex-start' : 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: multiline ? spacing.md : spacing.sm,
      minHeight: multiline ? 80 : 56,
    }

    if (variant === 'outlined') {
      baseStyle.borderWidth = 1
      baseStyle.borderColor = error ? theme.colors.error : theme.colors.outline
    }

    return baseStyle
  }

  const getInputStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      flex: 1,
      fontSize: 16,
      color: theme.colors.onSurface,
      fontWeight: '400',
      paddingTop: multiline ? spacing.sm : 0,
    }

    if (leftIcon) {
      baseStyle.marginLeft = spacing.sm
    }

    if (rightIcon) {
      baseStyle.marginRight = spacing.sm
    }

    return baseStyle
  }

  return (
    <Animated.View style={[getContainerStyle(), containerAnimatedStyle, style]}>
      <Animated.View style={[getInputContainerStyle(), borderAnimatedStyle]}>
        {leftIcon && (
          <View style={styles.iconContainer}>
            {leftIcon}
          </View>
        )}
        
        <View style={styles.inputWrapper}>
          {(isFocused || value) && (
            <Animated.Text style={[styles.floatingLabel, labelAnimatedStyle]}>
              {label}
            </Animated.Text>
          )}
          
          <RNTextInput
            ref={inputRef}
            style={[getInputStyle(), inputStyle]}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={isFocused ? placeholder : label}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            editable={!disabled}
            multiline={multiline}
            numberOfLines={numberOfLines}
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            autoCapitalize={autoCapitalize}
            autoComplete={autoComplete}
          />
        </View>

        {rightIcon && (
          <View style={styles.iconContainer}>
            {rightIcon}
          </View>
        )}
      </Animated.View>

      {((error && errorMessage) || (!error && helperText)) && (
        <HelperText type={error ? 'error' : 'info'} visible={true}>
          {error ? errorMessage : helperText}
        </HelperText>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
  floatingLabel: {
    position: 'absolute',
    top: -8,
    left: 0,
    fontSize: 12,
    fontWeight: '500',
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    zIndex: 1,
  },
})