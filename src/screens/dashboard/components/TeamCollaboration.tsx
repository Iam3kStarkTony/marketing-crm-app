import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Card, Text, Button, Avatar } from 'react-native-paper'
import { useTheme } from '../../../contexts/ThemeContext'

interface TeamCollaborationProps {
  loading?: boolean
}

interface TeamMemberProps {
  avatar: string
  name: string
  role: string
  project: string
  status: 'Completed' | 'In Progress' | 'Pending'
}

const TeamMember: React.FC<TeamMemberProps> = ({ avatar, name, role, project, status }) => {
  const { theme } = useTheme()
  const styles = createStyles(theme)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return '#4CAF50' // Green
      case 'In Progress':
        return '#FF9800' // Orange
      case 'Pending':
        return '#F44336' // Red
      default:
        return theme.colors.outline
    }
  }

  const getStatusStyle = (status: string) => {
    return {
      ...styles.statusBadge,
      backgroundColor: getStatusColor(status) + '20', // Add transparency
      borderColor: getStatusColor(status),
    }
  }

  return (
    <View style={styles.memberItem}>
      <Avatar.Text size={40} label={name.substring(0, 2)} style={styles.avatar} />
      <View style={styles.memberContent}>
        <Text style={styles.memberName}>{name}</Text>
        <Text style={styles.memberRole}>{role}: {project}</Text>
      </View>
      <View style={getStatusStyle(status)}>
        <Text style={[styles.statusText, { color: getStatusColor(status) }]}>{status}</Text>
      </View>
    </View>
  )
}

const TeamCollaboration: React.FC<TeamCollaborationProps> = ({ loading = false }) => {
  const { theme } = useTheme()
  const styles = createStyles(theme)

  // Mock data for team members
  const teamData = [
    {
      id: '1',
      avatar: 'AD',
      name: 'Alexandra Deff',
      role: 'Working on',
      project: 'GitHub Project Repository',
      status: 'Completed' as const,
    },
    {
      id: '2',
      avatar: 'EA',
      name: 'Edwin Adenike',
      role: 'Working on',
      project: 'Integrate User Authentication System',
      status: 'In Progress' as const,
    },
    {
      id: '3',
      avatar: 'IO',
      name: 'Isaac Oluwatemilorun',
      role: 'Working on',
      project: 'Drag and Drop Search and Filter Functionality',
      status: 'Pending' as const,
    },
    {
      id: '4',
      avatar: 'DO',
      name: 'David Oshinodi',
      role: 'Working on',
      project: 'Responsive Layout for Homepage',
      status: 'In Progress' as const,
    },
  ]

  const handleAddMember = () => {
    // Handle add member logic
    console.log('Add new team member')
  }

  return (
    <Card style={styles.container}>
      <Card.Content>
        <View style={styles.header}>
          <Text style={styles.title}>Team Collaboration</Text>
          <Button 
            mode="outlined" 
            style={styles.addButton}
            labelStyle={styles.addButtonLabel}
            icon="plus"
            onPress={handleAddMember}
          >
            Add Member
          </Button>
        </View>
        <View style={styles.membersContainer}>
          {teamData.map((member) => (
            <TeamMember
              key={member.id}
              avatar={member.avatar}
              name={member.name}
              role={member.role}
              project={member.project}
              status={member.status}
            />
          ))}
        </View>
      </Card.Content>
    </Card>
  )
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    marginRight: 8,
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
  addButton: {
    borderColor: '#2D5A27',
    borderRadius: 8,
  },
  addButtonLabel: {
    color: '#2D5A27',
    fontSize: 14,
    marginLeft: 4,
  },
  membersContainer: {
    marginTop: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  avatar: {
    marginRight: 12,
    backgroundColor: '#2D5A27',
  },
  memberContent: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
})

export default TeamCollaboration