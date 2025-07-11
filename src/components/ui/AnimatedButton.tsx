import React from 'react'
import { Pressable, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import { Text } from 'react-native-paper'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated'
import { useTheme } from '../../contexts/ThemeContext'
import { shadows, spacing, borderRadius, animations } from '../../config/theme'

interface AnimatedButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  icon?: React.ReactNode
  style?: ViewStyle
  textStyle?: TextStyle
  fullWidth?: boolean
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export default function AnimatedButton({ 
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}: AnimatedButtonProps) {
  const { theme, isDark } = useTheme()
  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)
  const backgroundColor = useSharedValue(0)

  const handlePressIn = () => {
    scale.value = withSpring(0.96, {
      damping: 15,
      stiffness: 300,
    })
    backgroundColor.value = withTiming(1, {
      duration: animations.timing.quick,
    })
  }

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    })
    backgroundColor.value = withTiming(0, {
      duration: animations.timing.quick,
    })
  }

  const animatedStyle = useAnimatedStyle(() => {
    const getBackgroundColor = () => {
      switch (variant) {
        case 'primary':
          return interpolateColor(
            backgroundColor.value,
            [0, 1],
            [theme.colors.primary, theme.colors.primaryContainer]
          )
        case 'secondary':
          return interpolateColor(
            backgroundColor.value,
            [0, 1],
            [theme.colors.secondary, theme.colors.secondaryContainer]
          )
        case 'outline':
          return interpolateColor(
            backgroundColor.value,
            [0, 1],
            ['transparent', theme.colors.surfaceVariant]
          )
        case 'ghost':
          return interpolateColor(
            backgroundColor.value,
            [0, 1],
            ['transparent', theme.colors.surfaceVariant]
          )
        default:
          return theme.colors.primary
      }
    }

    return {
      transform: [{ scale: scale.value }],
      backgroundColor: getBackgroundColor(),
      opacity: disabled ? 0.6 : opacity.value,
    }
  })

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    }

    // Size variations
    switch (size) {
      case 'small':
        baseStyle.paddingHorizontal = spacing.md
        baseStyle.paddingVertical = spacing.sm
        baseStyle.minHeight = 36
        break
      case 'large':
        baseStyle.paddingHorizontal = spacing.xl
        baseStyle.paddingVertical = spacing.md
        baseStyle.minHeight = 56
        break
      default: // medium
        baseStyle.paddingHorizontal = spacing.lg
        baseStyle.paddingVertical = spacing.sm + 2
        baseStyle.minHeight = 48
        break
    }

    // Variant styles
    switch (variant) {
      case 'outline':
        baseStyle.borderWidth = 1.5
        baseStyle.borderColor = theme.colors.outline
        break
      case 'primary':
        baseStyle.backgroundColor = theme.colors.primary
        baseStyle.shadowColor = theme.colors.primary
        baseStyle.shadowOffset = { width: 0, height: 4 }
        baseStyle.shadowOpacity = 0.3
        baseStyle.shadowRadius = 8
        baseStyle.elevation = 6
        break
      case 'secondary':
        baseStyle.backgroundColor = theme.colors.secondary
        baseStyle.shadowColor = theme.colors.secondary
        baseStyle.shadowOffset = { width: 0, height: 2 }
        baseStyle.shadowOpacity = 0.2
        baseStyle.shadowRadius = 4
        baseStyle.elevation = 3
        break
    }

    if (fullWidth) {
      baseStyle.width = '100%'
    }

    return baseStyle
  }

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return theme.colors.onPrimary
      case 'secondary':
        return theme.colors.onSecondary
      case 'outline':
      case 'ghost':
        return theme.colors.primary
      default:
        return theme.colors.onPrimary
    }
  }

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 14
      case 'large':
        return 18
      default:
        return 16
    }
  }

  return (
    <AnimatedPressable
      style={[getButtonStyle(), animatedStyle, style]}
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
    >
      {icon && (
        <Animated.View style={[styles.iconContainer, { marginRight: spacing.sm }]}>
          {icon}
        </Animated.View>
      )}
      <Text
        style={[
          {
            color: getTextColor(),
            fontSize: getTextSize(),
            fontWeight: '600',
            letterSpacing: 0.5,
          },
          textStyle,
        ]}
      >
        {loading ? 'Loading...' : title}
      </Text>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})