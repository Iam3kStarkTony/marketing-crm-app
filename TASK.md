# Marketing Agency CRM App - Development Task Plan

## Project Overview
Building a comprehensive Marketing Agency CRM application using React Native (frontend), n8n (backend orchestration), and Supabase (database, auth, real-time features).

## Technology Stack
- **Frontend**: React Native with Expo
- **Backend**: n8n workflow automation
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with MFA
- **Real-time**: Supabase Realtime
- **Storage**: Supabase Storage
- **Edge Functions**: Supabase Edge Functions

---

## Phase 1: Environment Setup & Project Initialization

### 1.1 Prerequisites & Account Setup
- [x] **Development Accounts**:
  - [x] Create Expo account (free): https://expo.dev
  - [ ] Apple Developer Account ($99/year) for iOS deployment
  - [ ] Google Play Developer Account ($25 one-time) for Android
  - [x] Supabase account (free tier available)
  - [x] n8n Cloud account or self-hosted instance

- [x] **Required Software**:
  - [x] Node.js (v18 or later): https://nodejs.org - **COMPLETED: v22.13.0**
  - [ ] Git: https://git-scm.com - **Will use existing GitHub account**
  - [ ] VS Code or preferred IDE
  - [ ] Android Studio (optional - only for local Android testing)
  - [ ] Xcode (optional - only for local iOS testing, macOS only)
  - **Note**: EAS handles all builds in the cloud, so local development tools are optional

### 1.2 Development Environment Setup
- [x] Install Node.js (v18+) and npm/yarn - **COMPLETED: v22.13.0**
- [x] Install Expo CLI: `npm install -g @expo/cli` - **COMPLETED: v0.24.19**
- [x] Install Supabase CLI: `npm install -g supabase` - **COMPLETED: v2.30.4 (via npx)**
- [x] Install EAS CLI: `npm install -g eas-cli` - **COMPLETED: v16.14.0**
- [x] Set up n8n instance (self-hosted or cloud) - **COMPLETED: n8n running**
- [x] Create Supabase project and get credentials - **COMPLETED: Supabase project created**
- [x] Set up code editor with React Native extensions - **COMPLETED: Using Trae IDE**

### 1.3 Mobile Development Setup (Optional - EAS handles cloud builds)
- [ ] **Android Setup (Optional for local testing)**:
  - [ ] Install Android Studio (only if you want local emulator testing)
  - [ ] Configure Android SDK and emulator
  - [ ] Set up environment variables (ANDROID_HOME)
  - [ ] Test emulator functionality
  - **Note**: EAS builds in the cloud, so this is only needed for local development/testing

- [ ] **iOS Setup (Optional - macOS only)**:
  - [ ] Install Xcode from App Store (only for local iOS simulator testing)
  - [ ] Install Xcode Command Line Tools
  - [ ] Set up iOS Simulator
  - [ ] Configure signing certificates
  - **Note**: EAS handles iOS builds in the cloud, including code signing

- [ ] **Alternative: Use Expo Go for Development**:
  - [ ] Install Expo Go app on your physical device
  - [ ] Scan QR code from `npx expo start` to test on real device
  - [ ] No need for simulators/emulators during development phase

### 1.4 Version Control Setup
- [ ] Initialize Git repository
- [ ] Set up GitHub/GitLab repository
- [ ] Configure .gitignore for React Native
- [ ] Set up branch protection rules

### 1.2 Project Structure Creation
- [ ] Initialize React Native project with Expo:
  ```bash
  npx create-expo-app CRMApp
  cd CRMApp
  ```
- [ ] Create project folder structure:
  ```
  CRMApp/
  ├── src/
  │   ├── components/
  │   ├── screens/
  │   ├── navigation/
  │   ├── services/
  │   ├── utils/
  │   ├── hooks/
  │   └── types/
  ├── supabase/
  │   ├── migrations/
  │   ├── functions/
  │   └── policies/
  ├── n8n/
  │   └── workflows/
  └── docs/
  ```

### 1.3 EAS CLI Setup & Configuration
- [ ] Install EAS CLI globally:
  ```bash
  npm install -g eas-cli
  ```
- [ ] Login to your Expo account:
  ```bash
  eas login
  ```
- [ ] Configure EAS build for your project:
  ```bash
  eas build:configure
  ```
- [ ] This will create an `eas.json` file with default build profiles

### 1.5 EAS Benefits & Cloud Build Advantages
- [ ] **Why EAS Eliminates Local Build Requirements**:
  - ✅ **No Android Studio needed**: EAS builds Android APKs/AABs in the cloud
  - ✅ **No Xcode needed**: EAS handles iOS builds and code signing remotely
  - ✅ **No local SDK management**: EAS manages all platform SDKs and dependencies
  - ✅ **Consistent builds**: Same environment every time, no "works on my machine" issues
  - ✅ **Faster setup**: Skip hours of local toolchain configuration
  - ✅ **Cross-platform**: Build iOS apps from Windows/Linux machines
  - ✅ **Automatic code signing**: EAS manages certificates and provisioning profiles
  - ✅ **Build caching**: Faster subsequent builds with intelligent caching

- [ ] **Development Workflow with EAS**:
  ```bash
  # Develop with Expo Go (no local builds needed)
  npx expo start
  # Scan QR code with Expo Go app on your phone
  
  # When ready to test native features
  eas build --platform android --profile development
  eas build --platform ios --profile development
  
  # Deploy to app stores
  eas build --platform all --profile production
  eas submit --platform all
  ```

### 1.6 Core Dependencies Installation
- [ ] Install React Navigation:
  ```bash
  npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
  npx expo install react-native-screens react-native-safe-area-context
  ```
- [ ] Install Supabase client:
  ```bash
  npm install @supabase/supabase-js
  ```
- [ ] Install additional dependencies:
  ```bash
  npm install react-native-paper react-native-vector-icons
  npm install @react-native-async-storage/async-storage
  npm install react-hook-form react-native-image-picker
  ```

### 1.7 Complete Setup Verification
- [ ] **Test Development Environment**:
  ```bash
  # Start development server
  npx expo start
  
  # Test on Android emulator
  npx expo start --android
  
  # Test on iOS simulator (macOS only)
  npx expo start --ios
  ```
- [ ] **Verify EAS Integration**:
  ```bash
  # Test EAS build configuration
  eas build:configure
  
  # Verify EAS login
  eas whoami
  ```
- [ ] **Test Basic Functionality**:
  - [ ] App loads successfully on emulator/simulator
  - [ ] Hot reload works correctly
  - [ ] No console errors in development
  - [ ] Navigation between screens works

### 1.8 Development Workflow Setup
- [ ] **Code Quality Tools**:
  ```bash
  # Install development dependencies
  npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser
  npm install --save-dev prettier eslint-config-prettier
  npm install --save-dev @types/react @types/react-native
  ```
- [ ] **Testing Framework**:
  ```bash
  # Install testing dependencies
  npm install --save-dev jest @testing-library/react-native
  npm install --save-dev @testing-library/jest-native
  ```
- [ ] **Configure package.json scripts**:
  ```json
  {
    "scripts": {
      "start": "expo start",
      "android": "expo start --android",
      "ios": "expo start --ios",
      "web": "expo start --web",
      "test": "jest",
      "lint": "eslint . --ext .ts,.tsx",
      "format": "prettier --write \"**/*.{ts,tsx,json}\"",
      "build:android": "eas build --platform android",
      "build:ios": "eas build --platform ios",
      "submit:android": "eas submit --platform android",
      "submit:ios": "eas submit --platform ios"
    }
  }
  ```

---

## Phase 2: Supabase Backend Setup

### 2.1 Supabase Project Initialization
- [ ] Initialize Supabase in project:
  ```bash
  supabase init
  supabase login
  supabase link --project-ref YOUR_PROJECT_REF
  ```
- [ ] Set up local development:
  ```bash
  supabase start
  ```

### 2.2 Database Schema Design & Implementation

#### 2.2.1 Core Tables Creation
- [ ] Create `profiles` table (extends auth.users):
  ```sql
  CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('admin', 'staff', 'client')) NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    company TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- [ ] Create `clients` table:
  ```sql
  CREATE TABLE clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    company TEXT,
    address TEXT,
    status TEXT CHECK (status IN ('active', 'inactive', 'prospect')) DEFAULT 'prospect',
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- [ ] Create `tasks` table:
  ```sql
  CREATE TABLE tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    assigned_to UUID REFERENCES profiles(id),
    client_id UUID REFERENCES clients(id),
    due_date TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- [ ] Create `messages` table:
  ```sql
  CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    sender_id UUID REFERENCES profiles(id) NOT NULL,
    recipient_id UUID REFERENCES profiles(id),
    client_id UUID REFERENCES clients(id),
    is_internal BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- [ ] Create `file_attachments` table:
  ```sql
  CREATE TABLE file_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    task_id UUID REFERENCES tasks(id),
    message_id UUID REFERENCES messages(id),
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

#### 2.2.2 Database Functions & Triggers
- [ ] Create updated_at trigger function:
  ```sql
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ language 'plpgsql';
  ```

- [ ] Apply triggers to tables:
  ```sql
  CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  ```

### 2.3 Row Level Security (RLS) Policies

#### 2.3.1 Enable RLS on all tables
- [ ] Enable RLS:
  ```sql
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
  ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
  ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;
  ```

#### 2.3.2 Create RLS Policies
- [ ] Profiles policies:
  ```sql
  -- Users can view their own profile
  CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
  
  -- Users can update their own profile
  CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);
  
  -- Staff and admins can view all profiles
  CREATE POLICY "Staff can view all profiles" ON profiles
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('admin', 'staff')
      )
    );
  ```

- [ ] Clients policies:
  ```sql
  -- Staff and admins can manage clients
  CREATE POLICY "Staff can manage clients" ON clients
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('admin', 'staff')
      )
    );
  
  -- Clients can view their own data
  CREATE POLICY "Clients can view own data" ON clients
    FOR SELECT USING (
      email = (SELECT email FROM profiles WHERE id = auth.uid())
    );
  ```

- [ ] Tasks policies:
  ```sql
  -- Staff can manage all tasks
  CREATE POLICY "Staff can manage tasks" ON tasks
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('admin', 'staff')
      )
    );
  
  -- Clients can view tasks assigned to them
  CREATE POLICY "Clients can view assigned tasks" ON tasks
    FOR SELECT USING (
      client_id IN (
        SELECT id FROM clients
        WHERE email = (SELECT email FROM profiles WHERE id = auth.uid())
      )
    );
  ```

### 2.4 Supabase Storage Setup
- [ ] Create storage buckets:
  ```sql
  INSERT INTO storage.buckets (id, name, public) VALUES
    ('avatars', 'avatars', true),
    ('attachments', 'attachments', false);
  ```

- [ ] Create storage policies:
  ```sql
  -- Avatar upload policy
  CREATE POLICY "Avatar upload" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'avatars' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  
  -- Attachment upload policy
  CREATE POLICY "Attachment upload" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'attachments' AND
      auth.role() = 'authenticated'
    );
  ```

### 2.5 Edge Functions Development

#### 2.5.1 Create notification function
- [ ] Create notification edge function:
  ```bash
  supabase functions new send-notification
  ```

- [ ] Implement notification logic:
  ```typescript
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
  
  Deno.serve(async (req: Request) => {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );
  
    const { type, recipient, message, data } = await req.json();
  
    // Send push notification logic
    // Send email notification logic
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  });
  ```

#### 2.5.2 Create webhook handler for n8n
- [ ] Create n8n webhook handler:
  ```bash
  supabase functions new n8n-webhook
  ```

- [ ] Implement webhook processing:
  ```typescript
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
  
  Deno.serve(async (req: Request) => {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  
    const payload = await req.json();
    
    // Process n8n webhook data
    // Update database based on workflow results
    
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  });
  ```

### 2.6 Migration Script Creation
- [ ] Create comprehensive migration script:
  ```bash
  supabase db dump --data-only > initial_data.sql
  supabase db reset
  ```

- [ ] Create `setup_database.sql` with all tables, policies, and initial data
- [ ] Test migration script on fresh Supabase instance

---

## Phase 3: n8n Backend Orchestration Setup

### 3.1 n8n Instance Configuration
- [ ] Set up n8n instance (Docker or cloud)
- [ ] Configure environment variables:
  ```env
  SUPABASE_URL=your_supabase_url
  SUPABASE_ANON_KEY=your_anon_key
  SUPABASE_SERVICE_KEY=your_service_key
  WEBHOOK_URL=your_webhook_url
  ```

### 3.2 Core Workflow Development

#### 3.2.1 Client Management Workflow
- [ ] Create "Client Onboarding" workflow:
  - Webhook trigger for new client registration
  - Data validation and processing
  - Welcome email automation
  - Task creation for account setup
  - Notification to assigned staff

#### 3.2.2 Task Management Workflow
- [ ] Create "Task Assignment" workflow:
  - Webhook trigger for task creation
  - Assignee notification (email + push)
  - Due date reminders
  - Status update notifications

#### 3.2.3 Communication Workflow
- [ ] Create "Message Processing" workflow:
  - Webhook trigger for new messages
  - Real-time notification delivery
  - Email notifications for offline users
  - File attachment processing

#### 3.2.4 Reporting Workflow
- [ ] Create "Daily Reports" workflow:
  - Scheduled trigger (daily)
  - Data aggregation from Supabase
  - Report generation
  - Email delivery to stakeholders

### 3.3 Webhook Integration Setup
- [ ] Configure Supabase webhooks to trigger n8n workflows
- [ ] Set up webhook URLs in Supabase dashboard
- [ ] Test webhook connectivity and data flow
- [ ] Implement error handling and retry logic

---

## Phase 4: React Native Frontend Development

### 4.1 Core App Structure

#### 4.1.1 Supabase Client Setup
- [ ] Create Supabase client configuration:
  ```typescript
  // src/services/supabase.ts
  import { createClient } from '@supabase/supabase-js'
  import AsyncStorage from '@react-native-async-storage/async-storage'
  
  const supabaseUrl = 'YOUR_SUPABASE_URL'
  const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'
  
  export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
  ```

#### 4.1.2 Authentication System
- [ ] Create authentication context:
  ```typescript
  // src/contexts/AuthContext.tsx
  import React, { createContext, useContext, useEffect, useState } from 'react'
  import { Session, User } from '@supabase/supabase-js'
  import { supabase } from '../services/supabase'
  
  interface AuthContextType {
    session: Session | null
    user: User | null
    signIn: (email: string, password: string) => Promise<void>
    signUp: (email: string, password: string) => Promise<void>
    signOut: () => Promise<void>
  }
  
  const AuthContext = createContext<AuthContextType>({} as AuthContextType)
  
  export const useAuth = () => useContext(AuthContext)
  
  export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Implementation
  }
  ```

- [ ] Implement authentication screens:
  - Login screen with email/password
  - Registration screen
  - Password reset screen
  - MFA setup screen

#### 4.1.3 Navigation Setup
- [ ] Create navigation structure:
  ```typescript
  // src/navigation/AppNavigator.tsx
  import React from 'react'
  import { NavigationContainer } from '@react-navigation/native'
  import { createNativeStackNavigator } from '@react-navigation/native-stack'
  import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
  
  const Stack = createNativeStackNavigator()
  const Tab = createBottomTabNavigator()
  
  export const AppNavigator = () => {
    // Implementation
  }
  ```

### 4.2 Core Feature Implementation

#### 4.2.1 Client Management Module
- [ ] Create client list screen:
  - Search and filter functionality
  - Infinite scroll/pagination
  - Pull-to-refresh
  - Client status indicators

- [ ] Create client detail screen:
  - Client information display
  - Edit client functionality
  - Associated tasks view
  - Communication history

- [ ] Create add/edit client screen:
  - Form validation
  - Image upload for client logo
  - Address autocomplete

#### 4.2.2 Task Management Module
- [ ] Create task list screen:
  - Filter by status, priority, assignee
  - Sort by due date, priority
  - Task status indicators
  - Swipe actions (complete, edit, delete)

- [ ] Create task detail screen:
  - Task information display
  - File attachments
  - Comments/notes
  - Status update functionality

- [ ] Create add/edit task screen:
  - Rich text editor for description
  - Date/time picker for due date
  - Assignee selection
  - Priority selection
  - File attachment upload

#### 4.2.3 Communication Module
- [ ] Create chat interface:
  - Real-time messaging with Supabase Realtime
  - Message bubbles with sender identification
  - File sharing capabilities
  - Message status indicators

- [ ] Create internal communication:
  - Staff-only channels
  - Broadcast messaging
  - Notification management

#### 4.2.4 Client Portal Module
- [ ] Create client dashboard:
  - Assigned tasks overview
  - Recent communications
  - File downloads
  - Project status updates

- [ ] Create client task view:
  - Task details and progress
  - File upload for client feedback
  - Comments and communication

### 4.3 Advanced Features

#### 4.3.1 Real-time Features
- [ ] Implement real-time subscriptions:
  ```typescript
  // src/hooks/useRealtime.ts
  import { useEffect, useState } from 'react'
  import { supabase } from '../services/supabase'
  
  export const useRealtime = (table: string, filter?: string) => {
    const [data, setData] = useState([])
    
    useEffect(() => {
      const subscription = supabase
        .channel(`public:${table}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table },
          (payload) => {
            // Handle real-time updates
          }
        )
        .subscribe()
      
      return () => {
        subscription.unsubscribe()
      }
    }, [table, filter])
    
    return data
  }
  ```

#### 4.3.2 Push Notifications
- [ ] Set up Expo push notifications:
  ```bash
  npx expo install expo-notifications expo-device expo-constants
  ```

- [ ] Implement notification service:
  ```typescript
  // src/services/notifications.ts
  import * as Notifications from 'expo-notifications'
  import * as Device from 'expo-device'
  import Constants from 'expo-constants'
  
  export const registerForPushNotificationsAsync = async () => {
    // Implementation
  }
  ```

#### 4.3.3 Offline Support
- [ ] Implement offline data caching
- [ ] Add sync functionality when back online
- [ ] Show offline indicators

### 4.4 UI/UX Implementation

#### 4.4.1 Design System
- [ ] Create theme configuration:
  ```typescript
  // src/theme/index.ts
  export const theme = {
    colors: {
      primary: '#007AFF',
      secondary: '#5856D6',
      success: '#34C759',
      warning: '#FF9500',
      error: '#FF3B30',
      background: '#F2F2F7',
      surface: '#FFFFFF',
      text: '#000000',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    typography: {
      // Font definitions
    },
  }
  ```

- [ ] Create reusable components:
  - Button variants
  - Input fields
  - Cards
  - Loading states
  - Error boundaries

#### 4.4.2 Accessibility
- [ ] Add accessibility labels
- [ ] Implement screen reader support
- [ ] Add keyboard navigation
- [ ] Test with accessibility tools

---

## Phase 5: Integration & Testing

### 5.1 Unit Testing Setup
- [ ] **Configure Jest and Testing Library**:
  ```bash
  npm install --save-dev jest @testing-library/react-native @testing-library/jest-native
  npm install --save-dev react-test-renderer
  ```
- [ ] **Create test configuration** (`jest.config.js`):
  ```javascript
  module.exports = {
    preset: 'react-native',
    setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
    transformIgnorePatterns: [
      'node_modules/(?!(react-native|@react-native|expo|@expo|@supabase)/)',
    ],
  };
  ```
- [ ] **Write component tests**:
  - [ ] Test authentication components
  - [ ] Test client management components
  - [ ] Test task management components
  - [ ] Test navigation components
  - [ ] Test form validation

### 5.2 API Integration Testing
- [ ] **Supabase Integration Tests**:
  - [ ] Test user authentication (login/logout/signup)
  - [ ] Test CRUD operations for clients
  - [ ] Test CRUD operations for tasks
  - [ ] Test real-time subscriptions
  - [ ] Test file upload/download
  - [ ] Test RLS policies enforcement
  - [ ] Test database triggers and functions

- [ ] **API Error Handling Tests**:
  - [ ] Test network failure scenarios
  - [ ] Test authentication token expiry
  - [ ] Test rate limiting responses
  - [ ] Test malformed request handling
  - [ ] Test server error responses

### 5.3 n8n Workflow Testing
- [ ] **Webhook Testing**:
  - [ ] Test client creation webhooks
  - [ ] Test task assignment webhooks
  - [ ] Test status update webhooks
  - [ ] Test error handling in webhooks

- [ ] **Notification Testing**:
  - [ ] Test email notification delivery
  - [ ] Test push notification delivery
  - [ ] Test notification templates
  - [ ] Test notification scheduling

- [ ] **Workflow Integration**:
  - [ ] Test data processing workflows
  - [ ] Test conditional workflow execution
  - [ ] Test workflow error recovery
  - [ ] Test workflow performance

### 5.4 End-to-End Testing
- [ ] **User Journey Testing**:
  - [ ] Complete user registration flow
  - [ ] User profile setup and management
  - [ ] Client onboarding process
  - [ ] Task creation and assignment
  - [ ] Task completion workflow
  - [ ] Communication and messaging
  - [ ] File upload and sharing
  - [ ] Notification reception and handling

- [ ] **Cross-Platform Testing**:
  - [ ] Test on Android devices (multiple screen sizes)
  - [ ] Test on iOS devices (multiple screen sizes)
  - [ ] Test on tablets and different orientations
  - [ ] Test offline functionality
  - [ ] Test app state restoration

### 5.5 Performance Testing
- [ ] **App Performance**:
  - [ ] Measure app startup time
  - [ ] Profile memory usage
  - [ ] Test scroll performance
  - [ ] Measure navigation performance
  - [ ] Test with large datasets

- [ ] **Network Performance**:
  - [ ] Test API response times
  - [ ] Test with slow network conditions
  - [ ] Test offline/online transitions
  - [ ] Optimize bundle size
  - [ ] Test image loading performance

### 5.6 Device Testing
- [ ] **Physical Device Testing**:
  - [ ] Test on low-end Android devices
  - [ ] Test on high-end Android devices
  - [ ] Test on various iOS devices
  - [ ] Test different OS versions
  - [ ] Test with different network conditions

- [ ] **Simulator/Emulator Testing**:
  - [ ] Android emulator testing
  - [ ] iOS simulator testing
  - [ ] Test different screen densities
  - [ ] Test different system languages
  - [ ] Test accessibility features

### 5.7 Security Testing
- [ ] **Authentication Security**:
  - [ ] Test JWT token handling
  - [ ] Test session management
  - [ ] Test password security
  - [ ] Test biometric authentication

- [ ] **Data Security**:
  - [ ] Test data encryption
  - [ ] Test secure storage
  - [ ] Test API security
  - [ ] Test file upload security

### 5.8 Automated Testing Pipeline
- [ ] **CI/CD Integration**:
  ```yaml
  # .github/workflows/test.yml
  name: Test
  on: [push, pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - uses: actions/setup-node@v3
          with:
            node-version: '18'
        - run: npm ci
        - run: npm test
        - run: npm run lint
  ```
- [ ] **Test Coverage**:
  - [ ] Set up code coverage reporting
  - [ ] Aim for >80% test coverage
  - [ ] Monitor coverage trends
  - [ ] Generate coverage reports

---

## Phase 6: Enterprise Security & Compliance

### 6.1 Authentication & Authorization (Industry Standard)
- [ ] **Multi-Factor Authentication (MFA)**:
  - [ ] Implement TOTP (Time-based One-Time Password)
  - [ ] SMS-based verification as backup
  - [ ] Biometric authentication for mobile
  - [ ] Hardware security keys support (FIDO2/WebAuthn)

- [ ] **Role-Based Access Control (RBAC)**:
  - [ ] Implement granular permissions system
  - [ ] Role hierarchy (Super Admin > Admin > Manager > Staff > Client)
  - [ ] Feature-based permissions (read, write, delete, export)
  - [ ] Time-based access controls
  - [ ] IP-based access restrictions

- [ ] **Session Management**:
  - [ ] JWT with short expiration (15 minutes)
  - [ ] Refresh token rotation
  - [ ] Concurrent session limits
  - [ ] Session invalidation on suspicious activity
  - [ ] Device fingerprinting

### 6.2 Data Security (Enterprise Grade)
- [ ] **Encryption Standards**:
  - [ ] AES-256 encryption for data at rest
  - [ ] TLS 1.3 for data in transit
  - [ ] End-to-end encryption for sensitive communications
  - [ ] Database-level encryption (Supabase Vault)
  - [ ] File encryption for attachments

- [ ] **Data Classification & Handling**:
  - [ ] Classify data sensitivity levels (Public, Internal, Confidential, Restricted)
  - [ ] Implement data masking for non-production environments
  - [ ] Secure data deletion (cryptographic erasure)
  - [ ] Data loss prevention (DLP) measures

- [ ] **API Security**:
  - [ ] Rate limiting (100 requests/minute per user)
  - [ ] API key management and rotation
  - [ ] Request signing and validation
  - [ ] SQL injection prevention
  - [ ] XSS protection headers
  - [ ] CORS configuration

### 6.3 Compliance Frameworks
- [ ] **GDPR Compliance (EU)**:
  - [ ] Data mapping and inventory
  - [ ] Lawful basis documentation
  - [ ] Data subject rights implementation:
    - [ ] Right to access (data export)
    - [ ] Right to rectification (data correction)
    - [ ] Right to erasure ("right to be forgotten")
    - [ ] Right to portability (data export in standard format)
    - [ ] Right to object (opt-out mechanisms)
  - [ ] Privacy by design implementation
  - [ ] Data Protection Impact Assessment (DPIA)
  - [ ] Breach notification system (72-hour rule)

- [ ] **SOC 2 Type II Preparation**:
  - [ ] Security controls documentation
  - [ ] Availability monitoring
  - [ ] Processing integrity checks
  - [ ] Confidentiality measures
  - [ ] Privacy controls

- [ ] **ISO 27001 Alignment**:
  - [ ] Information security management system (ISMS)
  - [ ] Risk assessment procedures
  - [ ] Security incident response plan
  - [ ] Business continuity planning

### 6.4 Audit & Monitoring
- [ ] **Comprehensive Audit Logging**:
  - [ ] User authentication events
  - [ ] Data access and modification logs
  - [ ] Administrative actions
  - [ ] Failed login attempts
  - [ ] Permission changes
  - [ ] Data export/deletion events
  - [ ] API usage logs

- [ ] **Security Monitoring**:
  - [ ] Real-time threat detection
  - [ ] Anomaly detection (unusual access patterns)
  - [ ] Failed authentication monitoring
  - [ ] Data breach detection
  - [ ] Automated security alerts

- [ ] **Log Management**:
  - [ ] Centralized logging (ELK Stack or similar)
  - [ ] Log retention policies (7 years for compliance)
  - [ ] Log integrity protection
  - [ ] Regular log analysis

### 6.5 Vulnerability Management
- [ ] **Security Testing**:
  - [ ] Automated vulnerability scanning (OWASP ZAP)
  - [ ] Dependency vulnerability checks (npm audit)
  - [ ] Static Application Security Testing (SAST)
  - [ ] Dynamic Application Security Testing (DAST)
  - [ ] Penetration testing (annual)

- [ ] **Security Headers**:
  ```javascript
  // Security headers implementation
  {
    "Content-Security-Policy": "default-src 'self'",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
  }
  ```

### 6.6 Business Continuity & Disaster Recovery
- [ ] **Backup Strategy (3-2-1 Rule)**:
  - [ ] 3 copies of data
  - [ ] 2 different storage media
  - [ ] 1 offsite backup
  - [ ] Automated daily backups
  - [ ] Point-in-time recovery capability
  - [ ] Cross-region backup replication

- [ ] **Disaster Recovery Plan**:
  - [ ] Recovery Time Objective (RTO): < 4 hours
  - [ ] Recovery Point Objective (RPO): < 1 hour
  - [ ] Failover procedures documentation
  - [ ] Regular disaster recovery testing
  - [ ] Communication plan for incidents

### 6.7 Privacy & Data Protection
- [ ] **Privacy by Design**:
  - [ ] Data minimization principles
  - [ ] Purpose limitation
  - [ ] Storage limitation
  - [ ] Accuracy requirements
  - [ ] Transparency measures

- [ ] **Consent Management**:
  - [ ] Granular consent options
  - [ ] Consent withdrawal mechanisms
  - [ ] Consent audit trail
  - [ ] Cookie consent management

### 6.8 Third-Party Security
- [ ] **Vendor Risk Assessment**:
  - [ ] Supabase security evaluation
  - [ ] n8n security assessment
  - [ ] Expo/EAS security review
  - [ ] Third-party integration security

- [ ] **Supply Chain Security**:
  - [ ] Dependency scanning
  - [ ] Software Bill of Materials (SBOM)
  - [ ] License compliance checking
  - [ ] Regular dependency updates

### 6.9 Security Implementation Examples

#### Authentication Security (React Native)
```javascript
// Secure token storage
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

class AuthService {
  // Biometric authentication
  async authenticateWithBiometrics() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access CRM',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });
      return result.success;
    }
    return false;
  }

  // Secure token storage
  async storeToken(token, refreshToken) {
    await SecureStore.setItemAsync('access_token', token);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
  }

  // Token rotation
  async refreshAccessToken() {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    // Implement token refresh logic
  }
}
```

#### API Security Middleware (Supabase Edge Functions)
```javascript
// Rate limiting and security headers
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const rateLimitMap = new Map();

serve(async (req) => {
  // Rate limiting
  const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100;

  if (!rateLimitMap.has(clientIP)) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + windowMs });
  } else {
    const clientData = rateLimitMap.get(clientIP);
    if (now > clientData.resetTime) {
      rateLimitMap.set(clientIP, { count: 1, resetTime: now + windowMs });
    } else {
      clientData.count++;
      if (clientData.count > maxRequests) {
        return new Response('Rate limit exceeded', { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((clientData.resetTime - now) / 1000).toString()
          }
        });
      }
    }
  }

  // Security headers
  const headers = {
    'Content-Security-Policy': "default-src 'self'",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block'
  };

  // Process request...
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
});
```

#### Data Encryption (Supabase)
```sql
-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Encryption for sensitive data
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Encrypt sensitive client data
ALTER TABLE clients ADD COLUMN encrypted_notes TEXT;

-- Function to encrypt data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(encrypt(data::bytea, 'encryption_key', 'aes'), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt data
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN convert_from(decrypt(decode(encrypted_data, 'base64'), 'encryption_key', 'aes'), 'UTF8');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Audit Logging System
```sql
-- Audit log table
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50),
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    ip_address
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    inet_client_addr()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers
CREATE TRIGGER clients_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

### 6.10 Compliance Checklist

#### GDPR Compliance Implementation
- [ ] **Data Processing Records**:
  ```javascript
  // Data processing consent tracking
  const consentTypes = {
    MARKETING: 'marketing_emails',
    ANALYTICS: 'usage_analytics',
    FUNCTIONAL: 'app_functionality'
  };

  class ConsentManager {
    async recordConsent(userId, consentType, granted) {
      await supabase.from('user_consents').insert({
        user_id: userId,
        consent_type: consentType,
        granted: granted,
        timestamp: new Date().toISOString(),
        ip_address: await this.getClientIP()
      });
    }

    async exportUserData(userId) {
      // Implement comprehensive data export
      const userData = await this.gatherAllUserData(userId);
      return this.formatForExport(userData);
    }

    async deleteUserData(userId) {
      // Implement right to be forgotten
      await this.anonymizeUserData(userId);
    }
  }
  ```

#### Security Monitoring Dashboard
- [ ] **Real-time Security Metrics**:
  - Failed login attempts per hour
  - API rate limit violations
  - Unusual access patterns
  - Data export requests
  - Permission escalation attempts

#### Incident Response Plan
1. **Detection** (< 15 minutes)
2. **Assessment** (< 30 minutes)
3. **Containment** (< 1 hour)
4. **Notification** (< 72 hours for GDPR)
5. **Recovery** (< 4 hours RTO)
6. **Lessons Learned** (within 1 week)

### 6.11 Security Testing Checklist
- [ ] **Automated Security Tests**:
  ```javascript
  // Security test examples
  describe('Security Tests', () => {
    test('should prevent SQL injection', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const result = await api.searchClients(maliciousInput);
      expect(result.error).toBeDefined();
    });

    test('should enforce rate limiting', async () => {
      const requests = Array(101).fill().map(() => api.login('test', 'pass'));
      const results = await Promise.all(requests);
      expect(results.some(r => r.status === 429)).toBe(true);
    });

    test('should validate JWT tokens', async () => {
      const invalidToken = 'invalid.jwt.token';
      const result = await api.getProfile(invalidToken);
      expect(result.status).toBe(401);
    });
  });
  ```

This comprehensive security framework aligns with industry standards including SOC 2, ISO 27001, and GDPR requirements, ensuring enterprise-grade data protection and compliance.

---
ee
## Phase 7: EAS Build & App Store Deployment

### 7.1 EAS Configuration Setup
- [ ] Create and configure `eas.json` file:
  ```json
  {
    "cli": {
      "version": ">= 5.0.0"
    },
    "build": {
      "development": {
        "developmentClient": true,
        "distribution": "internal",
        "ios": {
          "simulator": true
        }
      },
      "preview": {
        "distribution": "internal",
        "channel": "preview"
      },
      "production": {
        "channel": "production",
        "autoIncrement": true
      }
    },
    "submit": {
      "production": {
        "ios": {
          "appleId": "your-apple-id@example.com",
          "ascAppId": "1234567890",
          "appleTeamId": "ABCD123456"
        },
        "android": {
          "serviceAccountKeyPath": "./google-service-account.json",
          "track": "internal"
        }
      }
    }
  }
  ```

### 7.2 Development Builds
- [ ] Create development build for Android:
  ```bash
  eas build --platform android --profile development
  ```
- [ ] Create development build for iOS (simulator):
  ```bash
  eas build --platform ios --profile development
  ```
- [ ] Install development build on devices/simulators
- [ ] Test development build with Expo Dev Client

### 7.3 Preview Builds (Internal Testing)
- [ ] Create preview build for Android:
  ```bash
  eas build --platform android --profile preview
  ```
- [ ] Create preview build for iOS:
  ```bash
  eas build --platform ios --profile preview
  ```
- [ ] Distribute preview builds to internal testers
- [ ] Collect feedback and iterate

### 7.3.1 TestFlight Setup & Distribution (iOS)
- [ ] **Apple Developer Account Setup**:
  - [ ] Enroll in Apple Developer Program ($99/year)
  - [ ] Create App Store Connect app record
  - [ ] Configure app bundle identifier
  - [ ] Set up app metadata and descriptions

- [ ] **TestFlight Configuration**:
  - [ ] Add internal testers (up to 100 users)
  - [ ] Create external testing groups
  - [ ] Configure test information and instructions
  - [ ] Set up automatic distribution

- [ ] **Upload TestFlight Build**:
  ```bash
  # Build for TestFlight
  eas build --platform ios --profile preview
  
  # Submit to TestFlight
  eas submit --platform ios --profile production
  ```

- [ ] **TestFlight Testing Process**:
  - [ ] Invite internal testers via email
  - [ ] Monitor crash reports and feedback
  - [ ] Iterate based on tester feedback
  - [ ] Prepare for external testing (optional)

### 7.3.2 Google Play Internal Testing (Android)
- [ ] **Google Play Console Setup**:
  - [ ] Create Google Play Developer account ($25 one-time fee)
  - [ ] Create app in Google Play Console
  - [ ] Configure app details and store listing
  - [ ] Set up internal testing track

- [ ] **Internal Testing Distribution**:
  ```bash
  # Build for internal testing
  eas build --platform android --profile preview
  
  # Submit to Google Play Internal Testing
  eas submit --platform android --profile production
  ```

- [ ] **Testing Process**:
  - [ ] Add internal testers (up to 100 users)
  - [ ] Share internal testing link
  - [ ] Monitor crash reports and ANRs
  - [ ] Collect feedback and iterate

### 7.4 Production Builds
- [ ] Prepare app store assets:
  - [ ] App icons (multiple sizes)
  - [ ] Screenshots for different devices
  - [ ] App description and metadata
  - [ ] Privacy policy and terms of service

- [ ] Configure app signing credentials:
  - [ ] iOS: Apple Developer account and certificates
  - [ ] Android: Google Play Console and signing keys

- [ ] Create production build for Android:
  ```bash
  eas build --platform android --profile production
  ```
- [ ] Create production build for iOS:
  ```bash
  eas build --platform ios --profile production
  ```

### 7.5 App Store Submission
- [ ] Submit Android app to Google Play Store:
  ```bash
  eas submit --platform android --profile production
  ```
- [ ] Submit iOS app to Apple App Store:
  ```bash
  eas submit --platform ios --profile production
  ```
- [ ] Monitor submission status and respond to review feedback

### 7.6 EAS Update Setup (Over-the-Air Updates)
- [ ] Configure EAS Update in your project:
  ```bash
  eas update:configure
  ```
- [ ] Update `app.json` with EAS Update configuration:
  ```json
  {
    "expo": {
      "updates": {
        "url": "https://u.expo.dev/[your-project-id]"
      },
      "runtimeVersion": {
        "policy": "sdkVersion"
      }
    }
  }
  ```

### 7.7 Automated Build Workflows
- [ ] Create EAS Workflow file (`.eas/workflows/build.yml`):
  ```yaml
  name: Build and Deploy
  
  on:
    push:
      branches: ['main']
  
  jobs:
    build_android:
      name: Build Android App
      type: build
      params:
        platform: android
        profile: production
    
    build_ios:
      name: Build iOS App
      type: build
      params:
        platform: ios
        profile: production
    
    deploy_update:
      name: Deploy Update
      type: update
      needs: [build_android, build_ios]
      params:
        channel: production
        message: "Automated deployment from main branch"
  ```

### 7.8 Local Build Testing (Optional)
- [ ] Test local builds for debugging:
  ```bash
  eas build --platform android --local
  eas build --platform ios --local
  ```
- [ ] Verify build artifacts and troubleshoot issues

### 7.9 Build Monitoring & Management
- [ ] Monitor build status on EAS dashboard
- [ ] Set up build notifications
- [ ] Implement build artifact management
- [ ] Configure build caching for faster builds

---

## Phase 8: DevOps & Monitoring

### 8.1 Environment Setup
- [ ] Set up staging environment
- [ ] Configure production environment
- [ ] Set up CI/CD pipeline
- [ ] Configure environment variables

### 8.2 Monitoring & Analytics
- [ ] Set up error tracking (Sentry)
- [ ] Implement analytics (Expo Analytics)
- [ ] Set up performance monitoring
- [ ] Configure alerting

### 8.3 EAS Update Management
- [ ] Set up update channels (staging, production)
- [ ] Implement rollback procedures
- [ ] Monitor update adoption rates
- [ ] Configure update notifications

---

## Phase 9: Documentation & Maintenance

### 9.1 Documentation
- [ ] API documentation
- [ ] User manual
- [ ] Admin guide
- [ ] Developer documentation
- [ ] EAS build and deployment guide

### 9.2 Maintenance Plan
- [ ] Regular security updates
- [ ] Performance monitoring
- [ ] User feedback collection
- [ ] Feature enhancement planning
- [ ] Bug fix procedures
- [ ] EAS build optimization

---

## Environment Variables Configuration

### React Native App (.env)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
EXPO_PROJECT_ID=your-expo-project-id
EAS_PROJECT_ID=your-eas-project-id
```

### EAS Build Environment Variables
```env
# Apple Developer Account (iOS)
APPLE_ID=your-apple-id@example.com
APPLE_APP_SPECIFIC_PASSWORD=your-app-specific-password
APPLE_TEAM_ID=your-apple-team-id
ASC_APP_ID=your-app-store-connect-app-id

# Google Play Console (Android)
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account.json
ANDROID_KEYSTORE_PATH=./android-keystore.jks
ANDROID_KEYSTORE_PASSWORD=your-keystore-password
ANDROID_KEY_ALIAS=your-key-alias
ANDROID_KEY_PASSWORD=your-key-password

# EAS Update
EAS_UPDATE_URL=https://u.expo.dev/your-project-id
EAS_RUNTIME_VERSION=1.0.0
```

### n8n Environment Variables
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
PUSH_NOTIFICATION_KEY=your-push-key
```

### Supabase Edge Functions (.env)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
```

---

## Success Criteria

### Functional Requirements
- [ ] User authentication with MFA
- [ ] Client management (CRUD operations)
- [ ] Task management with assignments
- [ ] Real-time communication
- [ ] File sharing and attachments
- [ ] Client portal access
- [ ] Push notifications
- [ ] Basic reporting

### Non-Functional Requirements
- [ ] Response time < 2 seconds
- [ ] Support for 100+ concurrent users
- [ ] 99.9% uptime
- [ ] GDPR compliance
- [ ] Mobile-responsive design
- [ ] Offline capability

### Technical Requirements
- [ ] Automated testing coverage > 80%
- [ ] Code quality score > 8/10
- [ ] Security vulnerability score A+
- [ ] Performance score > 90
- [ ] Accessibility compliance AA

---

## Timeline Estimate

- **Phase 1-2**: 2-3 weeks (Environment & Backend Setup)
- **Phase 3**: 1-2 weeks (n8n Workflows)
- **Phase 4**: 4-6 weeks (Frontend Development)
- **Phase 5**: 2-3 weeks (Integration & Testing)
- **Phase 6**: 1-2 weeks (Security & Compliance)
- **Phase 7**: 2-3 weeks (EAS Build & App Store Deployment)
- **Phase 8**: 1-2 weeks (DevOps & Monitoring)
- **Phase 9**: 1 week (Documentation)

**Total Estimated Timeline**: 14-22 weeks

---

## Risk Mitigation

### Technical Risks
- **Database Performance**: Implement proper indexing and query optimization
- **Real-time Scalability**: Use Supabase Realtime with proper connection management
- **Mobile Performance**: Optimize bundle size and implement lazy loading

### Business Risks
- **User Adoption**: Implement comprehensive onboarding and training
- **Data Security**: Follow security best practices and regular audits
- **Compliance**: Regular compliance reviews and updates

### Operational Risks
- **Downtime**: Implement redundancy and monitoring
- **Data Loss**: Regular backups and disaster recovery testing
- **Scalability**: Monitor usage and plan for scaling

---

*This task plan provides a comprehensive roadmap for building the Marketing Agency CRM application. Each checkbox represents a specific deliverable that can be tracked and completed systematically.*