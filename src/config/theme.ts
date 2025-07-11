import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper'
import type { MD3Theme } from 'react-native-paper'
import { Platform } from 'react-native'

// Enhanced font configuration with SF Pro for iOS-like experience
const fontConfig = {
  web: {
    regular: {
      fontFamily: Platform.select({
        web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        default: 'System',
      }),
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: Platform.select({
        web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        default: 'System',
      }),
      fontWeight: '500' as const,
    },
    light: {
      fontFamily: Platform.select({
        web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        default: 'System',
      }),
      fontWeight: '300' as const,
    },
    thin: {
      fontFamily: Platform.select({
        web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        default: 'System',
      }),
      fontWeight: '100' as const,
    },
  },
  ios: {
    regular: {
      fontFamily: 'SF Pro Display',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'SF Pro Display',
      fontWeight: '500' as const,
    },
    light: {
      fontFamily: 'SF Pro Display',
      fontWeight: '300' as const,
    },
    thin: {
      fontFamily: 'SF Pro Display',
      fontWeight: '100' as const,
    },
  },
  android: {
    regular: {
      fontFamily: 'Roboto',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'Roboto',
      fontWeight: '500' as const,
    },
    light: {
      fontFamily: 'Roboto',
      fontWeight: '300' as const,
    },
    thin: {
      fontFamily: 'Roboto',
      fontWeight: '100' as const,
    },
  },
}

// iPhone-inspired light theme colors
const lightColors = {
  primary: '#007AFF',
  primaryContainer: '#E3F2FD',
  secondary: '#34C759',
  secondaryContainer: '#E8F5E8',
  tertiary: '#FF9500',
  tertiaryContainer: '#FFF3E0',
  surface: '#FFFFFF',
  surfaceVariant: '#F2F2F7',
  background: '#F2F2F7',
  error: '#FF3B30',
  errorContainer: '#FFEBEE',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#001D36',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#002106',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#2D1600',
  onSurface: '#000000',
  onSurfaceVariant: '#3C3C43',
  onError: '#FFFFFF',
  onErrorContainer: '#410E0B',
  onBackground: '#000000',
  outline: '#C6C6C8',
  outlineVariant: '#E5E5EA',
  inverseSurface: '#1C1C1E',
  inverseOnSurface: '#F2F2F7',
  inversePrimary: '#64D2FF',
  shadow: '#000000',
  scrim: '#000000',
  surfaceDisabled: 'rgba(60, 60, 67, 0.18)',
  onSurfaceDisabled: 'rgba(60, 60, 67, 0.29)',
  backdrop: 'rgba(0, 0, 0, 0.4)',
}

// Modern dark theme colors with better contrast
const darkColors = {
  primary: '#00D4AA',
  primaryContainer: '#1A365D',
  secondary: '#32D74B',
  secondaryContainer: '#0F2419',
  tertiary: '#FF9F0A',
  tertiaryContainer: '#2D1B00',
  surface: '#1A202C',
  surfaceVariant: '#2D3748',
  background: '#000000',
  error: '#FF453A',
  errorContainer: '#4A0E0E',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#FFFFFF',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#FFFFFF',
  onSurface: '#FFFFFF',
  onSurfaceVariant: '#FFFFFF',
  onError: '#FFFFFF',
  onErrorContainer: '#FFFFFF',
  onBackground: '#FFFFFF',
  outline: '#4A5568',
  outlineVariant: '#2D3748',
  inverseSurface: '#F7FAFC',
  inverseOnSurface: '#1A202C',
  inversePrimary: '#00B894',
  shadow: '#000000',
  scrim: '#000000',
  surfaceDisabled: 'rgba(255, 255, 255, 0.12)',
  onSurfaceDisabled: 'rgba(255, 255, 255, 0.38)',
  backdrop: 'rgba(0, 0, 0, 0.7)',
}

// Create light theme
export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    ...lightColors,
  },
  roundness: 12,
  animation: {
    scale: 1.0,
  },
}

// Create dark theme
export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors,
  },
  roundness: 12,
  animation: {
    scale: 1.0,
  },
}

// Default theme (light)
export const theme = lightTheme

// Additional theme constants
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

export const borderRadius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 50,
}

// iPhone-style shadows
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  xlarge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 12,
  },
}

// iPhone-style typography
export const typography = {
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 41,
    letterSpacing: 0.37,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: 0.36,
  },
  title2: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    letterSpacing: 0.35,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 25,
    letterSpacing: 0.38,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 21,
    letterSpacing: -0.32,
  },
  subhead: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  caption1: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0,
  },
  caption2: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 13,
    letterSpacing: 0.07,
  },
}

// Animation constants
export const animations = {
  timing: {
    quick: 200,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
  },
}

// Theme type for context
export type ThemeType = 'light' | 'dark'

export default lightTheme