import React from 'react'
import { View, TouchableOpacity, StatusBar } from 'react-native'
import { Searchbar, IconButton, Avatar, Text } from 'react-native-paper'
import { useTheme } from '../../contexts/ThemeContext'
import DashboardScreen from './DashboardScreen'
import FixedSidebarLayout from '../../components/FixedSidebarLayout'
import { useNavigation, useNavigationState } from '@react-navigation/native'

interface DashboardScreenWrapperProps {
  navigation: any
  route: any
}

const DashboardScreenWrapper: React.FC<DashboardScreenWrapperProps> = ({ navigation, route }) => {
  const { theme } = useTheme()
  const navigationState = useNavigationState(state => state)

  const headerContent = (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    }}>
      <View style={{ flex: 0.2 }}>
        {/* Left side - empty for now */}
      </View>
      
      <View style={{ flex: 0.6, alignItems: 'center' }}>
        <Searchbar
          placeholder="Search task"
          style={{
            backgroundColor: '#ffffff',
            elevation: 0,
            shadowOpacity: 0,
            borderRadius: 12,
            height: 40,
          }}
          inputStyle={{
            fontSize: 14,
            minHeight: 0,
            paddingVertical: 0,
          }}
          iconColor={theme.colors.onSurfaceVariant}
        />
      </View>
      
      <View style={{
        flex: 0.2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}>
        <IconButton icon="email-outline" size={20} iconColor={theme.colors.onSurfaceVariant} />
        <IconButton icon="bell-outline" size={20} iconColor={theme.colors.onSurfaceVariant} />
        <TouchableOpacity style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginLeft: 8,
        }}>
          <Avatar.Text size={32} label="TM" style={{ backgroundColor: theme.colors.primary }} />
          <View style={{ marginLeft: 8 }}>
            <Text variant="titleMedium" style={{
              fontSize: 14,
              fontWeight: '600',
              color: theme.colors.onSurface,
            }}>Totok Michael</Text>
            <Text variant="bodySmall" style={{
              fontSize: 12,
              color: theme.colors.onSurfaceVariant,
            }}>tmichael20@email.com</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <FixedSidebarLayout 
        header={headerContent}
        navigation={navigation}
        navigationState={navigationState}
      >
        <DashboardScreen navigation={navigation} route={route} />
      </FixedSidebarLayout>
    </>
  )
}

export default DashboardScreenWrapper