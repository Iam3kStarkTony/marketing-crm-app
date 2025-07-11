import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from './Sidebar';
import { useNavigation, useNavigationState } from '@react-navigation/native';

interface FixedSidebarLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
}

const FixedSidebarLayout: React.FC<FixedSidebarLayoutProps> = ({ children, header }) => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const navigationState = useNavigationState(state => state);
  const { width } = Dimensions.get('window');
  
  const sidebarWidth = 280;
  const contentWidth = width - sidebarWidth;

  return (
    <View style={styles.container}>
      {/* Fixed Sidebar */}
      <View style={[styles.sidebar, { width: sidebarWidth }]}>
        <View style={styles.sidebarContainer}>
          <Sidebar navigation={navigation as any} state={navigationState} />
        </View>
      </View>
      
      {/* Right Side Content */}
      <View style={[styles.rightSide, { width: contentWidth }]}>
        {/* Header Container */}
        {header && (
          <View style={styles.headerWrapper}>
            <View style={styles.headerContainer}>
              {header}
            </View>
          </View>
        )}
        
        {/* Main Content */}
        <View style={styles.content}>
          <View style={styles.contentContainer}>
            {children}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
  },
  sidebar: {
    backgroundColor: '#ffffff',
    padding: 16,
  },
  sidebarContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rightSide: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  headerWrapper: {
    marginBottom: 16,
  },
  headerContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    overflow: 'hidden',
  },
});

export default FixedSidebarLayout;