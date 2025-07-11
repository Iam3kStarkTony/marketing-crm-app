import React from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import {
  Text,
  Divider,
  Avatar,
} from 'react-native-paper'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { useNavigation, useNavigationState } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/AppNavigator';

type SidebarNavigationProp = NativeStackNavigationProp<MainStackParamList>;

interface SidebarProps {
  navigation: SidebarNavigationProp;
  state?: any;
}

const Sidebar: React.FC<SidebarProps> = ({ navigation, state }) => {
  const { theme } = useTheme()
  const { user, logout } = useAuth()
  const styles = createStyles(theme)

  const menuItems = [
    {
      name: 'Dashboard',
      icon: 'grid-outline',
      activeIcon: 'grid',
      route: 'Dashboard',
    },
    {
      name: 'Clients',
      icon: 'people-outline',
      activeIcon: 'people',
      route: 'Clients',
    },
    {
      name: 'Tasks',
      icon: 'checkbox-outline',
      activeIcon: 'checkbox',
      route: 'Tasks',
    },
    {
      name: 'Messages',
      icon: 'chatbubble-outline',
      activeIcon: 'chatbubble',
      route: 'Messages',
    },
    {
      name: 'Team',
      icon: 'people-circle-outline',
      activeIcon: 'people-circle',
      route: 'Team',
    },
    {
      name: 'Profile',
      icon: 'person-outline',
      activeIcon: 'person',
      route: 'Profile',
    },
  ]

  const generalItems = [
    {
      name: 'Settings',
      icon: 'settings-outline',
      activeIcon: 'settings',
      route: 'Settings',
    },
    {
      name: 'Help',
      icon: 'help-circle-outline',
      activeIcon: 'help-circle',
      route: 'Help',
    },
    {
      name: 'Logout',
      icon: 'log-out-outline',
      activeIcon: 'log-out',
      action: logout,
    },
  ]

  const handleNavigation = (item: any) => {
    if (item.action) {
      item.action()
    } else if (item.route) {
      navigation.navigate(item.route)
    }
  }

  const currentRoute = useNavigationState(state => {
    const route = state?.routes[state?.index || 0];
    return route?.name || 'Dashboard';
  });

  const isActive = (routeName: string) => {
    return currentRoute === routeName;
  }

  const renderMenuItem = (item: any, isActiveItem: boolean) => (
    <TouchableOpacity
      key={item.name}
      style={[
        styles.menuItem,
        isActiveItem && styles.activeMenuItem,
      ]}
      onPress={() => handleNavigation(item)}
    >
      <Ionicons
        name={isActiveItem ? item.activeIcon : item.icon}
        size={24}
        color={isActiveItem ? theme.colors.primary : theme.colors.onSurfaceVariant}
        style={styles.menuIcon}
      />
      <Text
        style={[
          styles.menuText,
          isActiveItem && styles.activeMenuText,
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {/* Header Section with Logo and Company Name */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/icon.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.companyName}>Stollberger Marketing</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Menu Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MENU</Text>
          {menuItems.map((item) =>
            renderMenuItem(item, isActive(item.route || ''))
          )}
        </View>

        <Divider style={styles.divider} />

        {/* General Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GENERAL</Text>
          {generalItems.map((item) =>
            renderMenuItem(item, false)
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    header: {
      padding: 24,
      paddingTop: 60,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    },
    logoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logoImage: {
      width: 40,
      height: 40,
      marginRight: 12,
    },
    companyName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    content: {
      flex: 1,
    },
    section: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      marginBottom: 12,
      letterSpacing: 1,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 4,
    },
    activeMenuItem: {
      backgroundColor: theme.colors.primaryContainer,
    },
    menuIcon: {
      marginRight: 16,
      width: 24,
    },
    menuText: {
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
    },
    activeMenuText: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    divider: {
      marginHorizontal: 16,
      marginVertical: 8,
    },
  })

export default Sidebar