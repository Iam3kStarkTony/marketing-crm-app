# CRM n8n Backend Orchestration

This directory contains the n8n workflow automation setup for the CRM system, implementing Phase 3 of the development plan.

## 📁 Directory Structure

```
n8n/
├── workflows/
│   ├── client-onboarding-workflow.json     # Client registration & onboarding
│   ├── task-management-workflow.json       # Task creation, updates & notifications
│   ├── communication-workflow.json         # Email campaigns & follow-ups
│   └── reporting-workflow.json             # Analytics & reporting
├── webhook-integration-setup.md             # Integration documentation
├── setup-n8n-workflows.js                  # Automated setup script
└── README.md                               # This file
```

## 🚀 Quick Start

### Prerequisites

1. **n8n Instance**: Running n8n instance (local or cloud)
2. **Supabase**: CRM database from Phase 2
3. **Gmail Account**: For email notifications (or other email service)
4. **Node.js**: For running setup scripts

### Setup Steps

1. **Configure Environment Variables**:
   ```bash
   export N8N_URL="https://your-n8n-instance.com"
   export N8N_API_KEY="your-api-key"  # Optional
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-key"
   export GMAIL_CLIENT_ID="your-gmail-client-id"
   export GMAIL_CLIENT_SECRET="your-gmail-client-secret"
   ```

2. **Import Workflows**:
   ```bash
   node setup-n8n-workflows.js --import
   ```

3. **Validate Setup**:
   ```bash
   node setup-n8n-workflows.js --validate
   ```

4. **Configure Credentials in n8n**:
   - Supabase API credentials
   - Gmail OAuth2 credentials
   - Update credential IDs in workflows

## 🔄 Workflows Overview

### 1. Client Onboarding Workflow
**File**: `client-onboarding-workflow.json`
**Webhook**: `/webhook/client-onboarding`

**Features**:
- ✅ Validates client data (name, email)
- ✅ Creates client record in Supabase
- ✅ Generates onboarding task
- ✅ Sends welcome email
- ✅ Notifies assigned staff
- ✅ Returns success/error response

**Flow**:
```
Webhook → Validate Data → Insert Client → Create Task → Send Email → Notify Staff → Response
```

### 2. Task Management Workflow
**File**: `task-management-workflow.json`
**Webhook**: `/webhook/task-management`

**Features**:
- ✅ Creates new tasks
- ✅ Updates existing tasks
- ✅ Notifies assignees
- ✅ Handles task completion
- ✅ Sends client notifications on completion
- ✅ Supports priority levels

**Flow**:
```
Webhook → Check Action → Create/Update Task → Notify Assignee → [If Completed] → Notify Client
```

### 3. Communication Workflow
**File**: `communication-workflow.json`
**Webhook**: `/webhook/communication`

**Features**:
- ✅ Email campaigns to client segments
- ✅ Automated follow-up emails
- ✅ Direct client messaging
- ✅ Message logging in database
- ✅ Template support with placeholders

**Flow Types**:
- **Campaign**: Get Recipients → Send Emails → Log Messages
- **Follow-up**: Check Last Message → Send if Due → Log
- **Direct**: Get Client → Send Email → Log

### 4. Reporting & Analytics Workflow
**File**: `reporting-workflow.json`
**Webhook**: `/webhook/reporting`

**Features**:
- ✅ Client summary reports
- ✅ Task analytics
- ✅ Communication statistics
- ✅ Email report delivery
- ✅ Real-time data processing

**Report Types**:
- **Client Summary**: Total, active, prospects, new clients
- **Task Analytics**: Completion rates, overdue tasks, priorities
- **Communication**: Message volumes, response times, engagement

## 🔗 Webhook Endpoints

Once workflows are imported and activated, you'll have these endpoints:

| Workflow | Endpoint | Purpose |
|----------|----------|----------|
| Client Onboarding | `POST /webhook/client-onboarding` | Register new clients |
| Task Management | `POST /webhook/task-management` | Create/update tasks |
| Communication | `POST /webhook/communication` | Send emails/campaigns |
| Reporting | `POST /webhook/reporting` | Generate reports |

## 📝 Integration Examples

### React Native Integration

```typescript
// services/n8nService.ts
const N8N_BASE = 'https://your-n8n-instance.com/webhook';

export const n8nService = {
  async onboardClient(clientData: ClientData) {
    const response = await fetch(`${N8N_BASE}/client-onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientData)
    });
    return response.json();
  },

  async createTask(taskData: TaskData) {
    const response = await fetch(`${N8N_BASE}/task-management`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...taskData })
    });
    return response.json();
  },

  async sendCampaign(campaignData: CampaignData) {
    const response = await fetch(`${N8N_BASE}/communication`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email_campaign', ...campaignData })
    });
    return response.json();
  },

  async generateReport(reportType: string) {
    const response = await fetch(`${N8N_BASE}/reporting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_type: reportType })
    });
    return response.json();
  }
};
```

### Supabase Edge Function

```typescript
// supabase/functions/n8n-proxy/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { endpoint, data } = await req.json();
  
  const response = await fetch(`https://your-n8n.com/webhook/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  });
});
```

## 🔧 Configuration

### Credential Setup

1. **Supabase Credentials**:
   - Type: `supabaseApi`
   - Host: Your Supabase project URL
   - Service Role Key: From Supabase dashboard

2. **Gmail Credentials**:
   - Type: `gmailOAuth2`
   - Client ID: From Google Cloud Console
   - Client Secret: From Google Cloud Console
   - Authorize with your Gmail account

### Workflow Activation

1. Import workflows using the setup script
2. Update credential IDs in each workflow
3. Activate all workflows in n8n interface
4. Test webhook endpoints

## 🧪 Testing

### Manual Testing

```bash
# Test client onboarding
curl -X POST https://your-n8n.com/webhook/client-onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client",
    "email": "test@example.com",
    "phone": "+1234567890"
  }'

# Test task creation
curl -X POST https://your-n8n.com/webhook/task-management \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "title": "Test Task",
    "description": "Test description",
    "priority": "high"
  }'

# Test email campaign
curl -X POST https://your-n8n.com/webhook/communication \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email_campaign",
    "subject": "Test Campaign",
    "message": "Hello {{client_name}}!",
    "target_status": "active"
  }'

# Test reporting
curl -X POST https://your-n8n.com/webhook/reporting \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "client_summary",
    "email_report": false
  }'
```

### Automated Testing

```bash
# Validate all workflows are working
node setup-n8n-workflows.js --validate
```

## 📊 Monitoring

### n8n Monitoring
- Check workflow execution logs
- Monitor webhook response times
- Track error rates

### Supabase Monitoring
- Database operation logs
- API usage statistics
- Real-time subscriptions

### Email Monitoring
- Gmail API quotas
- Delivery success rates
- Bounce/spam reports

## 🔒 Security

### Best Practices
- ✅ Use environment variables for secrets
- ✅ Implement webhook authentication
- ✅ Validate all input data
- ✅ Use HTTPS for all communications
- ✅ Regular credential rotation

### Rate Limiting
- Configure rate limits on webhook endpoints
- Monitor for unusual traffic patterns
- Implement circuit breakers for external APIs

## 🚨 Troubleshooting

### Common Issues

1. **Workflow Import Fails**:
   - Check n8n API connectivity
   - Verify JSON syntax in workflow files
   - Ensure proper permissions

2. **Webhook Not Responding**:
   - Verify workflow is activated
   - Check webhook URL format
   - Review n8n execution logs

3. **Email Not Sending**:
   - Verify Gmail credentials
   - Check OAuth2 authorization
   - Review Gmail API quotas

4. **Database Errors**:
   - Verify Supabase credentials
   - Check RLS policies
   - Review table permissions

### Debug Commands

```bash
# Check n8n connection
curl -I https://your-n8n.com/api/v1/workflows

# Test Supabase connection
curl -H "apikey: YOUR_KEY" https://your-project.supabase.co/rest/v1/clients

# Validate workflow syntax
node -e "console.log(JSON.parse(require('fs').readFileSync('workflows/client-onboarding-workflow.json')))"
```

## 📈 Performance Optimization

### Workflow Optimization
- Minimize external API calls
- Use batch operations where possible
- Implement proper error handling
- Cache frequently accessed data

### Database Optimization
- Index frequently queried columns
- Use database functions for complex operations
- Implement connection pooling
- Monitor query performance

## 🔄 Next Steps (Phase 4)

With Phase 3 complete, you can now proceed to Phase 4 - React Native Frontend Development:

1. **Core App Structure**:
   - Supabase client setup
   - Authentication system
   - Navigation structure

2. **Feature Implementation**:
   - Client management screens
   - Task management interface
   - Communication tools
   - Reporting dashboard

3. **Integration**:
   - Connect frontend to n8n webhooks
   - Implement real-time updates
   - Add offline support

## 📚 Additional Resources

- [n8n Documentation](https://docs.n8n.io/)
- [Supabase Documentation](https://supabase.com/docs)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)

---

**Phase 3 Status**: ✅ **COMPLETED**

**Deliverables**:
- ✅ 4 Production-ready n8n workflows
- ✅ Webhook integration setup
- ✅ Automated deployment script
- ✅ Comprehensive documentation
- ✅ Testing procedures
- ✅ Security guidelines

**Ready for Phase 4**: React Native Frontend Development