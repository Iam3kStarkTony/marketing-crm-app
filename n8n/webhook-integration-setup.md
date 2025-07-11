# n8n Webhook Integration Setup for CRM (Secure)

This document outlines the secure webhook integration architecture using Supabase Edge Function proxy and n8n header authentication for the CRM system.

## 🔐 Security Architecture

```
React Native App
      ↓ (JWT Token)
Supabase Edge Function (n8n-proxy)
      ↓ (API Key Header)
n8n Webhook (Header Auth)
      ↓ (Validated Request)
Workflow Execution
```

**Security Features:**
- JWT authentication for React Native requests
- API key validation in n8n webhooks
- User context enrichment
- Audit logging
- CORS protection
- Rate limiting capability

## Webhook Endpoints

### 1. Client Onboarding Webhook
- **Endpoint**: `POST /webhook/client-onboarding`
- **Workflow**: `client-onboarding-workflow.json`
- **Purpose**: Handle new client registration and onboarding process

**Request Body**:
```json
{
  "name": "Client Name",
  "email": "client@example.com",
  "phone": "+1234567890",
  "company": "Company Name",
  "address": "Client Address",
  "notes": "Additional notes",
  "created_by": "user_id",
  "assigned_to": "staff_user_id"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Client onboarding initiated successfully",
  "client_id": "uuid",
  "task_id": "uuid"
}
```

### 2. Task Management Webhook
- **Endpoint**: `POST /webhook/task-management`
- **Workflow**: `task-management-workflow.json`
- **Purpose**: Handle task creation, updates, and notifications

**Request Body for Creating Task**:
```json
{
  "action": "create",
  "title": "Task Title",
  "description": "Task Description",
  "status": "pending",
  "priority": "high",
  "client_id": "uuid",
  "assigned_to": "user_id",
  "due_date": "2024-12-31T23:59:59Z",
  "created_by": "user_id"
}
```

**Request Body for Updating Task**:
```json
{
  "action": "update",
  "task_id": "uuid",
  "title": "Updated Title",
  "status": "completed",
  "priority": "medium",
  "assigned_to": "user_id",
  "due_date": "2024-12-31T23:59:59Z"
}
```

### 3. Communication Webhook
- **Endpoint**: `POST /webhook/communication`
- **Workflow**: `communication-workflow.json`
- **Purpose**: Handle email campaigns, follow-ups, and direct messages

**Request Body for Email Campaign**:
```json
{
  "type": "email_campaign",
  "subject": "Campaign Subject",
  "message": "Email content with {{client_name}} placeholder",
  "target_status": "active",
  "sender_id": "user_id"
}
```

**Request Body for Follow-up**:
```json
{
  "type": "follow_up",
  "client_id": "uuid",
  "subject": "Follow-up Subject",
  "message": "Follow-up message",
  "follow_up_days": 7,
  "sender_id": "user_id"
}
```

**Request Body for Direct Message**:
```json
{
  "type": "direct_message",
  "client_id": "uuid",
  "subject": "Message Subject",
  "message": "Direct message content with {{client_name}} placeholder",
  "sender_id": "user_id"
}
```

### 4. Reporting Webhook
- **Endpoint**: `POST /webhook/reporting`
- **Workflow**: `reporting-workflow.json`
- **Purpose**: Generate analytics and reports

**Request Body for Client Summary**:
```json
{
  "report_type": "client_summary",
  "email_report": true,
  "recipient_email": "manager@company.com"
}
```

**Request Body for Task Analytics**:
```json
{
  "report_type": "task_analytics",
  "email_report": false
}
```

**Request Body for Communication Report**:
```json
{
  "report_type": "communication_report",
  "email_report": true,
  "recipient_email": "manager@company.com"
}
```

## Integration Steps

### 1. n8n Configuration

1. **Create Header Auth Credential**:
   - Go to n8n → Credentials → Create New
   - Select "Header Auth" credential type
   - Configure:
     - **Name**: `CRM-Webhook-Auth`
     - **Header Name**: `X-API-Key`
     - **Header Value**: `your-secure-api-key-here` (generate a strong random key)

2. **Import Workflows**:
   - Import all 4 workflow JSON files into your n8n instance
   - Update credential IDs in each workflow:
     - Replace `HEADER_AUTH_CREDENTIAL_ID` with your actual Header Auth credential ID
     - Replace `SUPABASE_CREDENTIAL_ID` with your actual Supabase credential ID
     - Replace `GMAIL_CREDENTIAL_ID` with your actual Gmail credential ID
   - Activate each workflow

3. **Configure Additional Credentials**:
   - Set up Supabase API credentials with your project URL and service key
   - Configure Gmail OAuth2 credentials for email sending

4. **Get Webhook URLs**:
   - After activating workflows, copy the webhook URLs from n8n
   - URLs will be in format: `https://your-n8n-instance.com/webhook/endpoint-name`
   - **Important**: These URLs are now protected by header authentication

### 2. Supabase Edge Function Setup

1. **Deploy the Edge Function**:
   ```bash
   cd supabase/functions/n8n-proxy
   supabase functions deploy n8n-proxy
   ```

2. **Set Environment Variables**:
   ```bash
   # Set the n8n API key (same as configured in n8n Header Auth credential)
   supabase secrets set N8N_API_KEY=your-secure-api-key-here
   
   # Set individual workflow URLs
   supabase secrets set N8N_CLIENT_ONBOARDING_URL=https://your-n8n-instance.com/webhook/client-onboarding
   supabase secrets set N8N_TASK_MANAGEMENT_URL=https://your-n8n-instance.com/webhook/task-management
   supabase secrets set N8N_COMMUNICATION_URL=https://your-n8n-instance.com/webhook/communication
   supabase secrets set N8N_REPORTING_URL=https://your-n8n-instance.com/webhook/reporting
   ```

### 3. React Native Integration

Create a service to handle secure webhook calls via Edge Function:

```javascript
// services/n8nService.js
import { supabase } from '../lib/supabase';

const EDGE_FUNCTION_URL = 'https://your-project.supabase.co/functions/v1/n8n-proxy';

class N8nService {
  async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  }

  async triggerClientOnboarding(clientData) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          workflow: 'client-onboarding',
          data: clientData
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Client onboarding failed:', error);
      throw error;
    }
  }

  async triggerTaskAction(taskData) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          workflow: 'task-management',
          data: taskData
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Task management failed:', error);
      throw error;
    }
  }

  async triggerCommunication(communicationData) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          workflow: 'communication',
          data: communicationData
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Communication failed:', error);
      throw error;
    }
  }

  async triggerReporting(reportData) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          workflow: 'reporting',
          data: reportData
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Reporting failed:', error);
      throw error;
    }
  }
}

export default new N8nService();
```

### 3. Supabase Edge Function Integration

Create an edge function to handle webhook calls from the React Native app:

```typescript
// supabase/functions/n8n-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const N8N_BASE_URL = Deno.env.get('N8N_BASE_URL') || 'https://your-n8n-instance.com/webhook';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { endpoint, data } = await req.json();
    
    const response = await fetch(`${N8N_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: response.status
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
```

### 4. Environment Variables

Add these environment variables to your React Native app:

```env
N8N_WEBHOOK_BASE_URL=https://your-n8n-instance.com/webhook
SUPABASE_EDGE_FUNCTION_URL=https://your-project.supabase.co/functions/v1/n8n-webhook
```

## Testing

### 1. Test Individual Workflows

Use tools like Postman or curl to test each webhook endpoint:

```bash
# Test client onboarding
curl -X POST https://your-n8n-instance.com/webhook/client-onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client",
    "email": "test@example.com",
    "phone": "+1234567890"
  }'

# Test task management
curl -X POST https://your-n8n-instance.com/webhook/task-management \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "title": "Test Task",
    "description": "Test task description",
    "priority": "high"
  }'
```

### 2. Monitor Workflow Executions

- Check n8n execution logs for any errors
- Verify data is being inserted into Supabase tables
- Test email notifications are being sent

## Security Considerations

### ✅ Implemented Security Features

#### Multi-Layer Authentication
- **JWT Authentication**: React Native app authenticates with Supabase
- **API Key Validation**: n8n webhooks validate `X-API-Key` header
- **User Context**: Edge function enriches requests with authenticated user data

#### Network Security
- **HTTPS Only**: All communications use encrypted connections
- **CORS Protection**: Proper CORS headers configured
- **Origin Validation**: Requests validated at multiple layers

#### Data Protection
- **Input Validation**: All webhook data validated and sanitized
- **Schema Validation**: Request bodies validated against expected schemas
- **Error Handling**: Secure error responses without sensitive data exposure

#### Audit & Monitoring
- **Request Logging**: All requests logged with user context
- **Error Tracking**: Failed requests logged for security monitoring
- **Rate Limiting**: Can be implemented at Edge Function level

### 🔧 Additional Security Recommendations

#### API Key Management
- Rotate API keys regularly (quarterly recommended)
- Use strong, randomly generated keys (minimum 32 characters)
- Store keys securely in environment variables
- Never expose keys in client-side code

#### Monitoring & Alerting
- Monitor for unusual traffic patterns
- Set up alerts for authentication failures
- Track workflow execution metrics
- Implement request rate monitoring

#### Network Security
- Use VPN or private networks for n8n instance if possible
- Implement IP whitelisting for n8n webhooks
- Consider using Supabase's built-in DDoS protection

#### Data Validation
- Implement strict input validation schemas
- Sanitize all user inputs
- Validate data types and ranges
- Use parameterized queries in workflows

## Monitoring and Logging

1. **n8n Logs**: Monitor workflow execution logs in n8n interface
2. **Supabase Logs**: Check Supabase logs for database operations
3. **Email Delivery**: Monitor Gmail/email service logs for delivery status
4. **Error Handling**: Implement proper error handling and alerting

This completes the webhook integration setup for Phase 3 of the CRM development plan.