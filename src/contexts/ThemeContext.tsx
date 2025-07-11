import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { lightTheme, darkTheme, ThemeType } from '../config/theme'
import type { MD3Theme } from 'react-native-paper'

interface ThemeContextType {
  theme: MD3Theme
  themeType: ThemeType
  toggleTheme: () => void
  setTheme: (themeType: ThemeType) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = '@app_theme_preference'

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme()
  const [themeType, setThemeType] = useState<ThemeType>('light')
  const [isLoading, setIsLoading] = useState(true)

  // Load saved theme preference on app start
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY)
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
          setThemeType(savedTheme as ThemeType)
        } else {
          // Use system preference if no saved preference
          setThemeType(systemColorScheme === 'dark' ? 'dark' : 'light')
        }
      } catch (error) {
        console.error('Error loading theme preference:', error)
        // Fallback to system preference
        setThemeType(systemColorScheme === 'dark' ? 'dark' : 'light')
      } finally {
        setIsLoading(false)
      }
    }

    loadThemePreference()
  }, [systemColorScheme])

  // Save theme preference when it changes
  const saveThemePreference = async (newTheme: ThemeType) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme)
    } catch (error) {
      console.error('Error saving theme preference:', error)
    }
  }

  const setTheme = (newThemeType: ThemeType) => {
    setThemeType(newThemeType)
    saveThemePreference(newThemeType)
  }

  const toggleTheme = () => {
    const newTheme = themeType === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  const currentTheme = themeType === 'dark' ? darkTheme : lightTheme
  const isDark = themeType === 'dark'

  // Don't render children until theme is loaded
  if (isLoading) {
    return null
  }

  const value: ThemeContextType = {
    theme: currentTheme,
    themeType,
    toggleTheme,
    setTheme,
    isDark,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export default ThemeProvider