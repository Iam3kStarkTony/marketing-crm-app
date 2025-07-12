import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Card, Text, Button, Avatar } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../../../contexts/ThemeContext'

interface ProjectListProps {
  loading?: boolean
}

interface ProjectItemProps {
  icon: string
  iconColor: string
  iconBackground: string
  title: string
  description: string
  date?: string
  onPress?: () => void
}

const ProjectItem: React.FC<ProjectItemProps> = ({
  icon,
  iconColor,
  iconBackground,
  title,
  description,
  date,
  onPress,
}) => {
  const { theme } = useTheme()
  const styles = createStyles(theme)

  return (
    <TouchableOpacity style={styles.projectItem} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: iconBackground }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={styles.projectContent}>
        <Text style={styles.projectTitle}>{title}</Text>
        <Text style={styles.projectDescription}>{description}</Text>
      </View>
      {date && <Text style={styles.projectDate}>{date}</Text>}
    </TouchableOpacity>
  )
}

const ProjectList: React.FC<ProjectListProps> = ({ loading = false }) => {
  const { theme } = useTheme()
  const styles = createStyles(theme)

  // Mock data for projects
  const projectsData = [
    {
      id: '1',
      icon: 'api',
      iconColor: '#2196F3',
      iconBackground: '#2196F320',
      title: 'Develop API Endpoints',
      description: 'Backend Development',
      date: 'June 15, 2023',
    },
    {
      id: '2',
      icon: 'account-group',
      iconColor: '#4CAF50',
      iconBackground: '#4CAF5020',
      title: 'Onboarding Flow',
      description: 'Customer Success',
      date: 'June 20, 2023',
    },
    {
      id: '3',
      icon: 'view-dashboard',
      iconColor: '#2D5A27',
      iconBackground: '#2D5A2720',
      title: 'Build Dashboard',
      description: 'System Design',
      date: 'June 25, 2023',
    },
    {
      id: '4',
      icon: 'speedometer',
      iconColor: '#FF9800',
      iconBackground: '#FF980020',
      title: 'Optimize Page Load',
      description: 'Performance',
      date: 'June 30, 2023',
    },
    {
      id: '5',
      icon: 'web',
      iconColor: '#9C27B0',
      iconBackground: '#9C27B020',
      title: 'Cross-Browser Testing',
      description: 'Browser Compatibility',
      date: 'July 5, 2023',
    },
  ]

  const handleAddProject = () => {
    // Handle add project logic
    console.log('Add new project')
  }

  return (
    <Card style={styles.container}>
      <Card.Content>
        <View style={styles.header}>
          <Text style={styles.title}>Project</Text>
          <Button 
            mode="outlined" 
            style={styles.newButton}
            labelStyle={styles.newButtonLabel}
            icon="plus"
            onPress={handleAddProject}
          >
            New
          </Button>
        </View>
        <View style={styles.projectsContainer}>
          {projectsData.map((project) => (
            <ProjectItem
              key={project.id}
              icon={project.icon}
              iconColor={project.iconColor}
              iconBackground={project.iconBackground}
              title={project.title}
              description={project.description}
              date={project.date}
            />
          ))}
        </View>
      </Card.Content>
    </Card>
  )
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 2, // Adjusted to maintain proper proportions
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  newButton: {
    borderColor: '#2D5A27',
    borderRadius: 8,
  },
  newButtonLabel: {
    color: '#2D5A27',
    fontSize: 14,
    marginLeft: 4,
  },
  projectsContainer: {
    marginTop: 8,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  projectContent: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  projectDescription: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  projectDate: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
})

export default ProjectList