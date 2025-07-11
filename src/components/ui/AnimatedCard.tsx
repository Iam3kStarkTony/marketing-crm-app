import React, { ReactNode } from 'react'
import { ViewStyle, StyleSheet } from 'react-native'
import { Card as PaperCard } from 'react-native-paper'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { useTheme } from '../../contexts/ThemeContext'
import { shadows, borderRadius, spacing, animations } from '../../config/theme'

interface AnimatedCardProps {
  children: ReactNode
  style?: ViewStyle
  onPress?: () => void
  variant?: 'elevated' | 'filled' | 'outlined'
  padding?: keyof typeof spacing
  margin?: keyof typeof spacing
  shadow?: keyof typeof shadows
  borderRadius?: keyof typeof borderRadius
  animated?: boolean
  pressable?: boolean
}

const AnimatedPaperCard = Animated.createAnimatedComponent(PaperCard)

export default function AnimatedCard({ 
  children,
  style,
  onPress,
  variant = 'elevated',
  padding = 'md',
  margin = 'sm',
  shadow = 'medium',
  borderRadius: cardBorderRadius = 'lg',
  animated = true,
  pressable = !!onPress,
}: AnimatedCardProps) {
  const { theme, isDark } = useTheme()
  const scale = useSharedValue(1)
  const translateY = useSharedValue(0)
  const shadowOpacity = useSharedValue(shadows[shadow].shadowOpacity)

  const tap = Gesture.Tap()
    .onBegin(() => {
      if (pressable && animated) {
        scale.value = withSpring(0.98, {
          damping: 15,
          stiffness: 300,
        })
        translateY.value = withSpring(2, {
          damping: 15,
          stiffness: 300,
        })
        shadowOpacity.value = withTiming(shadows[shadow].shadowOpacity * 0.7, {
          duration: animations.timing.quick,
        })
      }
    })
    .onFinalize(() => {
      if (pressable && animated) {
        scale.value = withSpring(1, {
          damping: 15,
          stiffness: 300,
        })
        translateY.value = withSpring(0, {
          damping: 15,
          stiffness: 300,
        })
        shadowOpacity.value = withTiming(shadows[shadow].shadowOpacity, {
          duration: animations.timing.quick,
        })
      }
      if (onPress) {
        onPress()
      }
    })

  const animatedStyle = useAnimatedStyle(() => {
    if (!animated) return {}

    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value },
      ],
      shadowOpacity: shadowOpacity.value,
    }
  })

  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      margin: spacing[margin],
      borderRadius: borderRadius[cardBorderRadius],
    }

    // Variant styles
    switch (variant) {
      case 'elevated':
        baseStyle.backgroundColor = theme.colors.surface
        baseStyle.shadowColor = isDark ? '#000000' : theme.colors.shadow
        baseStyle.shadowOffset = shadows[shadow].shadowOffset
        baseStyle.shadowOpacity = shadows[shadow].shadowOpacity
        baseStyle.shadowRadius = shadows[shadow].shadowRadius
        baseStyle.elevation = shadows[shadow].elevation
        break
      case 'filled':
        baseStyle.backgroundColor = theme.colors.surfaceVariant
        break
      case 'outlined':
        baseStyle.backgroundColor = theme.colors.surface
        baseStyle.borderWidth = 1
        baseStyle.borderColor = theme.colors.outline
        break
    }

    return baseStyle
  }

  const cardStyle = [getCardStyle(), animatedStyle, style];
  const contentStyle = { padding: spacing[padding] };

  if (pressable) {
    return (
      <GestureDetector gesture={tap}>
        <AnimatedPaperCard style={cardStyle} contentStyle={contentStyle}>
          {children}
        </AnimatedPaperCard>
      </GestureDetector>
    );
  }

  return (
    <AnimatedPaperCard style={cardStyle} contentStyle={contentStyle}>
      {children}
    </AnimatedPaperCard>
  );
}

// Specialized card variants
export const ProfileCard: React.FC<Omit<AnimatedCardProps, 'variant' | 'shadow'>> = (props) => (
  <AnimatedCard
    {...props}
    variant="elevated"
    shadow="large"
    borderRadius="xl"
    padding="lg"
  />
)

export const InfoCard: React.FC<Omit<AnimatedCardProps, 'variant'>> = (props) => (
  <AnimatedCard
    {...props}
    variant="filled"
    borderRadius="lg"
  />
)

export const ActionCard: React.FC<Omit<AnimatedCardProps, 'variant' | 'pressable'>> = (props) => (
  <AnimatedCard
    {...props}
    variant="elevated"
    pressable
    shadow="medium"
  />
)

const styles = StyleSheet.create({
  // Add any additional styles here if needed
})