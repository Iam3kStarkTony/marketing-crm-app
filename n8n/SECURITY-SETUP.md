# 🔐 Security Setup Guide for n8n CRM Integration

This guide provides step-by-step instructions for implementing the secure architecture for n8n webhook integration with your CRM system.

## 🏗️ Architecture Overview

```
┌─────────────────┐    JWT Auth    ┌──────────────────────┐    API Key    ┌─────────────────┐
│  React Native   │ ──────────────► │  Supabase Edge       │ ────────────► │  n8n Webhooks  │
│  Frontend       │                 │  Function (Proxy)    │               │  (Secured)      │
└─────────────────┘                 └──────────────────────┘               └─────────────────┘
        │                                      │                                      │
        │                                      │                                      │
        ▼                                      ▼                                      ▼
┌─────────────────┐                 ┌──────────────────────┐               ┌─────────────────┐
│ User Session    │                 │ • JWT Validation     │               │ • Header Auth   │
│ Management      │                 │ • User Context       │               │ • Input Valid.  │
│                 │                 │ • Request Logging    │               │ • Workflow Exec │
└─────────────────┘                 └──────────────────────┘               └─────────────────┘
```

## 🔧 Implementation Steps

### Step 1: Generate Secure API Key

```bash
# Generate a cryptographically secure API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Save this key securely - you'll need it for both n8n and Supabase configuration.**

### Step 2: Configure n8n Security

#### 2.1 Create Header Auth Credential

1. **Access n8n Interface**:
   - Go to your n8n instance
   - Navigate to **Credentials** → **Create New**

2. **Configure Header Auth**:
   - **Credential Type**: `Header Auth`
   - **Name**: `CRM-Webhook-Auth`
   - **Header Name**: `X-API-Key`
   - **Header Value**: `[your-generated-api-key]`
   - **Save** the credential and note the **Credential ID**

#### 2.2 Update Workflow Configurations

1. **Import Updated Workflows**:
   ```bash
   # All workflows are already updated with security configurations
   # Import them into your n8n instance
   ```

2. **Update Credential References**:
   - Open each workflow in n8n editor
   - Find the webhook trigger node
   - Update `HEADER_AUTH_CREDENTIAL_ID` with your actual credential ID
   - Update `SUPABASE_CREDENTIAL_ID` and `GMAIL_CREDENTIAL_ID` as needed

### Step 3: Deploy Supabase Edge Function

#### 3.1 Deploy the Proxy Function

```bash
# Navigate to the edge function directory
cd supabase/functions/n8n-proxy

# Deploy the function
supabase functions deploy n8n-proxy
```

#### 3.2 Configure Environment Variables

```bash
# Set the webhook API key (same as configured in n8n)
supabase secrets set N8N_API_KEY=your-generated-api-key

# Set individual workflow URLs (get these from n8n after activation)
supabase secrets set N8N_CLIENT_ONBOARDING_URL=https://your-n8n.com/webhook/client-onboarding
supabase secrets set N8N_TASK_MANAGEMENT_URL=https://your-n8n.com/webhook/task-management
supabase secrets set N8N_COMMUNICATION_URL=https://your-n8n.com/webhook/communication
supabase secrets set N8N_REPORTING_URL=https://your-n8n.com/webhook/reporting
```

### Step 4: Update React Native Integration

#### 4.1 Install Required Dependencies

```bash
# If not already installed
npm install @supabase/supabase-js
```

#### 4.2 Update Service Configuration

```javascript
// services/n8nService.js
import { supabase } from '../lib/supabase';

// Update with your actual Supabase project URL
const EDGE_FUNCTION_URL = 'https://your-project.supabase.co/functions/v1/n8n-proxy';

// Use the updated service code from webhook-integration-setup.md
```

## 🛡️ Security Features Implemented

### ✅ Authentication & Authorization
- **JWT Authentication**: All requests require valid user session
- **API Key Validation**: n8n webhooks validate API key headers
- **User Context Enrichment**: Requests include authenticated user information

### ✅ Network Security
- **HTTPS Enforcement**: All communications encrypted in transit
- **CORS Protection**: Proper cross-origin request handling
- **Request Validation**: Input validation at multiple layers

### ✅ Data Protection
- **Input Sanitization**: All user inputs validated and sanitized
- **Schema Validation**: Request bodies validated against expected schemas
- **Error Handling**: Secure error responses without data leakage

### ✅ Monitoring & Auditing
- **Request Logging**: All requests logged with user context
- **Error Tracking**: Failed requests logged for security analysis
- **Audit Trail**: Complete request/response logging

## 🔍 Testing Security Implementation

### Test 1: Unauthenticated Request

```bash
# This should fail with 401 Unauthorized
curl -X POST https://your-project.supabase.co/functions/v1/n8n-proxy \
  -H "Content-Type: application/json" \
  -d '{"workflow": "client-onboarding", "data": {}}'
```

### Test 2: Invalid Workflow

```bash
# This should fail with 400 Bad Request
curl -X POST https://your-project.supabase.co/functions/v1/n8n-proxy \
  -H "Authorization: Bearer valid-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"workflow": "invalid-workflow", "data": {}}'
```

### Test 3: Valid Request

```bash
# This should succeed with 200 OK
curl -X POST https://your-project.supabase.co/functions/v1/n8n-proxy \
  -H "Authorization: Bearer valid-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"workflow": "client-onboarding", "data": {"name": "Test Client"}}'
```

## 🚨 Security Best Practices

### API Key Management
- **Rotation**: Rotate API keys quarterly
- **Storage**: Store keys in secure environment variables only
- **Access**: Limit access to keys to essential personnel only
- **Monitoring**: Monitor for unauthorized key usage

### Network Security
- **VPN**: Use VPN for n8n instance access when possible
- **Firewall**: Implement IP whitelisting for n8n webhooks
- **SSL/TLS**: Ensure all connections use latest TLS versions

### Monitoring & Alerting
- **Failed Requests**: Set up alerts for authentication failures
- **Rate Limiting**: Monitor for unusual traffic patterns
- **Error Rates**: Track and alert on high error rates
- **Performance**: Monitor response times and availability

### Data Protection
- **Input Validation**: Validate all inputs at every layer
- **Output Sanitization**: Ensure responses don't leak sensitive data
- **Logging**: Log security events but not sensitive data
- **Encryption**: Encrypt sensitive data at rest and in transit

## 🔧 Troubleshooting

### Common Issues

#### 1. "Invalid API Key" Error
- **Check**: API key matches between n8n credential and Supabase secret
- **Verify**: Credential ID is correctly referenced in workflows
- **Test**: API key is properly base64 encoded if required

#### 2. "Unauthorized" Error
- **Check**: JWT token is valid and not expired
- **Verify**: User session is active in React Native app
- **Test**: Token is properly formatted in Authorization header

#### 3. "Workflow Not Found" Error
- **Check**: Workflow name matches exactly (case-sensitive)
- **Verify**: Workflow URLs are correctly set in Supabase secrets
- **Test**: n8n workflows are activated and accessible

#### 4. CORS Errors
- **Check**: Edge function CORS configuration
- **Verify**: Request origin is allowed
- **Test**: Preflight OPTIONS requests are handled

### Debug Commands

```bash
# Check Supabase secrets
supabase secrets list

# View edge function logs
supabase functions logs n8n-proxy

# Test edge function locally
supabase functions serve n8n-proxy
```

## 📞 Support

If you encounter issues with the security implementation:

1. **Check Logs**: Review Supabase Edge Function logs
2. **Verify Configuration**: Ensure all environment variables are set
3. **Test Components**: Test each layer independently
4. **Review Documentation**: Check this guide and webhook-integration-setup.md

---

**🔐 Remember**: Security is an ongoing process. Regularly review and update your security configurations, monitor for threats, and keep all components updated to the latest versions.