# N8N Workflow Functions Architecture

This document explains the new architecture for n8n workflow integration using individual Supabase Edge Functions.

## Overview

Instead of using a single `n8n-proxy` function, we now have dedicated Supabase Edge Functions for each workflow type:

- `client-onboarding` - Handles client onboarding workflows
- `communication` - Manages communication workflows
- `reporting` - Processes reporting workflows
- `task-management` - Handles task management workflows
- `notifications` - Manages notification workflows

## Architecture Benefits

1. **Better Separation of Concerns**: Each function handles a specific workflow type
2. **Improved Debugging**: Easier to trace issues to specific workflow functions
3. **Independent Scaling**: Each function can be scaled independently
4. **Clearer Logging**: Function-specific logs for better monitoring
5. **Follows Best Practices**: Matches the pattern used in successful Supabase projects

## Function Endpoints

All functions are available at:
```
https://[your-project-id].supabase.co/functions/v1/[function-name]
```

### Client Onboarding
- **Endpoint**: `/functions/v1/client-onboarding`
- **Purpose**: Triggers n8n workflows for new client onboarding
- **Environment Variables Required**:
  - `N8N_CLIENT_ONBOARDING_WEBHOOK_URL`
  - `N8N_API_KEY`

### Communication
- **Endpoint**: `/functions/v1/communication`
- **Purpose**: Handles communication workflows (emails, SMS, etc.)
- **Environment Variables Required**:
  - `N8N_COMMUNICATION_WEBHOOK_URL`
  - `N8N_API_KEY`

### Reporting
- **Endpoint**: `/functions/v1/reporting`
- **Purpose**: Triggers reporting and analytics workflows
- **Environment Variables Required**:
  - `N8N_REPORTING_WEBHOOK_URL`
  - `N8N_API_KEY`

### Task Management
- **Endpoint**: `/functions/v1/task-management`
- **Purpose**: Handles task-related workflows
- **Environment Variables Required**:
  - `N8N_TASK_MANAGEMENT_WEBHOOK_URL`
  - `N8N_API_KEY`

## Authentication

All functions require JWT authentication:
- Include `Authorization: Bearer [jwt-token]` header
- JWT token is validated against Supabase Auth
- User context is automatically added to workflow data

## Request Format

Each function expects a JSON payload with workflow-specific data:

```json
{
  "client_id": "uuid",
  "data": {
    // Workflow-specific data
  }
}
```

## Response Format

Successful responses:
```json
{
  "success": true,
  "message": "[Workflow] triggered successfully",
  "result": {
    // n8n response data
  }
}
```

Error responses:
```json
{
  "error": "Error description"
}
```

## Environment Variables Setup

Add these to your Supabase project secrets:

```bash
# n8n API Configuration
N8N_API_KEY=your_n8n_api_key

# Individual Webhook URLs
N8N_CLIENT_ONBOARDING_WEBHOOK_URL=https://your-n8n-instance.com/webhook/client-onboarding
N8N_COMMUNICATION_WEBHOOK_URL=https://your-n8n-instance.com/webhook/communication
N8N_REPORTING_WEBHOOK_URL=https://your-n8n-instance.com/webhook/reporting
N8N_TASK_MANAGEMENT_WEBHOOK_URL=https://your-n8n-instance.com/webhook/task-management
```

## Usage in React Native App

The `N8nIntegrationService` has been updated to use the new architecture:

```typescript
import { N8nIntegrationService } from '../services/n8nIntegration'

// Trigger client onboarding
await N8nIntegrationService.callN8nWorkflow('client-onboarding', {
  client_id: 'uuid',
  client_data: clientInfo
})

// Trigger communication workflow
await N8nIntegrationService.callN8nWorkflow('communication', {
  message_type: 'welcome_email',
  recipient: 'client@example.com'
})
```

## Migration from n8n-proxy

The old `n8n-proxy` function has been removed and replaced with individual functions. No changes are needed in the React Native app code as the `N8nIntegrationService` handles the routing automatically.

## Monitoring and Debugging

1. **Function Logs**: Check individual function logs in Supabase Dashboard
2. **Error Tracking**: Each function logs errors with workflow context
3. **Performance**: Monitor function execution times per workflow type

## Configuration in config.toml

Each function is configured with JWT verification:

```toml
[functions.client-onboarding]
verify_jwt = true

[functions.communication]
verify_jwt = true

[functions.reporting]
verify_jwt = true

[functions.task-management]
verify_jwt = true

[functions.notifications]
verify_jwt = true
```

## Next Steps

1. Configure n8n webhook URLs for each workflow type
2. Set up environment variables in Supabase
3. Test each workflow function individually
4. Monitor function performance and logs
5. Update n8n workflows to use the new webhook endpoints