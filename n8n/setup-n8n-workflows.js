#!/usr/bin/env node

/**
 * n8n CRM Workflows Setup Script
 * 
 * This script helps automate the setup of n8n workflows for the CRM system.
 * It can import workflows, configure credentials, and validate the setup.
 * 
 * Usage:
 *   node setup-n8n-workflows.js --import
 *   node setup-n8n-workflows.js --validate
 *   node setup-n8n-workflows.js --help
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const config = {
  n8nUrl: process.env.N8N_URL || 'http://localhost:5678',
  n8nApiKey: process.env.N8N_API_KEY || '',
  webhookApiKey: process.env.N8N_WEBHOOK_API_KEY || '', // New: API key for webhook authentication
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  gmailClientId: process.env.GMAIL_CLIENT_ID || '',
  gmailClientSecret: process.env.GMAIL_CLIENT_SECRET || ''
};

// Workflow files to import
const workflowFiles = [
  'client-onboarding-workflow.json',
  'task-management-workflow.json',
  'communication-workflow.json',
  'reporting-workflow.json'
];

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    if (config.n8nApiKey) {
      requestOptions.headers['X-N8N-API-KEY'] = config.n8nApiKey;
    }

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Check if n8n is accessible
async function checkN8nConnection() {
  console.log('🔍 Checking n8n connection...');
  try {
    const response = await makeRequest(`${config.n8nUrl}/api/v1/workflows`);
    if (response.status === 200) {
      console.log('✅ n8n is accessible');
      return true;
    } else {
      console.log(`❌ n8n returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Cannot connect to n8n: ${error.message}`);
    return false;
  }
}

// Import a single workflow
async function importWorkflow(workflowFile) {
  console.log(`📥 Importing workflow: ${workflowFile}`);
  
  try {
    const workflowPath = path.join(__dirname, 'workflows', workflowFile);
    if (!fs.existsSync(workflowPath)) {
      console.log(`❌ Workflow file not found: ${workflowPath}`);
      return false;
    }

    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    
    // Check if workflow already exists
    const existingResponse = await makeRequest(`${config.n8nUrl}/api/v1/workflows`);
    const existingWorkflows = existingResponse.data.data || [];
    const existingWorkflow = existingWorkflows.find(w => w.name === workflowData.name);
    
    if (existingWorkflow) {
      console.log(`⚠️  Workflow '${workflowData.name}' already exists. Updating...`);
      const updateResponse = await makeRequest(`${config.n8nUrl}/api/v1/workflows/${existingWorkflow.id}`, {
        method: 'PUT',
        body: workflowData
      });
      
      if (updateResponse.status === 200) {
        console.log(`✅ Updated workflow: ${workflowData.name}`);
        return true;
      } else {
        console.log(`❌ Failed to update workflow: ${updateResponse.status}`);
        return false;
      }
    } else {
      const createResponse = await makeRequest(`${config.n8nUrl}/api/v1/workflows`, {
        method: 'POST',
        body: workflowData
      });
      
      if (createResponse.status === 201) {
        console.log(`✅ Created workflow: ${workflowData.name}`);
        return true;
      } else {
        console.log(`❌ Failed to create workflow: ${createResponse.status}`);
        return false;
      }
    }
  } catch (error) {
    console.log(`❌ Error importing workflow ${workflowFile}: ${error.message}`);
    return false;
  }
}

// Import all workflows
async function importAllWorkflows() {
  console.log('🚀 Starting workflow import process...');
  
  const isConnected = await checkN8nConnection();
  if (!isConnected) {
    console.log('❌ Cannot proceed without n8n connection');
    return false;
  }

  let successCount = 0;
  for (const workflowFile of workflowFiles) {
    const success = await importWorkflow(workflowFile);
    if (success) successCount++;
  }

  console.log(`\n📊 Import Summary:`);
  console.log(`✅ Successfully imported: ${successCount}/${workflowFiles.length} workflows`);
  
  if (successCount === workflowFiles.length) {
    console.log('🎉 All workflows imported successfully!');
    return true;
  } else {
    console.log('⚠️  Some workflows failed to import. Check the logs above.');
    return false;
  }
}

// Create Supabase credential
async function createSupabaseCredential() {
  console.log('🔑 Creating Supabase credential...');
  
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    console.log('❌ Supabase URL and Service Key are required');
    return false;
  }

  const credentialData = {
    name: 'Supabase CRM',
    type: 'supabaseApi',
    data: {
      host: config.supabaseUrl,
      serviceRole: config.supabaseServiceKey
    }
  };

  try {
    const response = await makeRequest(`${config.n8nUrl}/api/v1/credentials`, {
      method: 'POST',
      body: credentialData
    });
    
    if (response.status === 201) {
      console.log(`✅ Created Supabase credential with ID: ${response.data.id}`);
      console.log(`📝 Update your workflows to use credential ID: ${response.data.id}`);
      return response.data.id;
    } else {
      console.log(`❌ Failed to create Supabase credential: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error creating Supabase credential: ${error.message}`);
    return false;
  }
}

// Create Header Auth credential for webhook security
async function createWebhookCredential() {
  console.log('🔑 Creating webhook authentication credential...');
  
  if (!config.webhookApiKey) {
    console.log('❌ Webhook API key is required');
    return false;
  }

  const credentialData = {
    name: 'CRM-Webhook-Auth',
    type: 'headerAuth',
    data: {
      name: 'X-API-Key',
      value: config.webhookApiKey
    }
  };

  try {
    const response = await makeRequest(`${config.n8nUrl}/api/v1/credentials`, {
      method: 'POST',
      body: credentialData
    });
    
    if (response.status === 201) {
      console.log(`✅ Created webhook credential with ID: ${response.data.id}`);
      return response.data.id;
    } else {
      console.log(`❌ Failed to create webhook credential: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error creating webhook credential: ${error.message}`);
    return false;
  }
}

// Validate workflow setup
async function validateSetup() {
  console.log('🔍 Validating workflow setup...');
  
  const isConnected = await checkN8nConnection();
  if (!isConnected) {
    return false;
  }

  try {
    const response = await makeRequest(`${config.n8nUrl}/api/v1/workflows`);
    const workflows = response.data.data || [];
    
    console.log(`\n📋 Found ${workflows.length} workflows in n8n:`);
    
    const expectedWorkflows = [
      'CRM - Client Onboarding Workflow',
      'CRM - Task Management Workflow', 
      'CRM - Communication Workflow',
      'CRM - Reporting & Analytics Workflow'
    ];
    
    let foundCount = 0;
    for (const expectedName of expectedWorkflows) {
      const found = workflows.find(w => w.name === expectedName);
      if (found) {
        console.log(`✅ ${expectedName} (ID: ${found.id}, Active: ${found.active})`);
        foundCount++;
      } else {
        console.log(`❌ ${expectedName} - NOT FOUND`);
      }
    }
    
    console.log(`\n📊 Validation Summary:`);
    console.log(`✅ Found: ${foundCount}/${expectedWorkflows.length} expected workflows`);
    
    if (foundCount === expectedWorkflows.length) {
      console.log('🎉 All workflows are properly set up!');
      
      // Check for webhook URLs
      console.log('\n🔗 Webhook URLs:');
      for (const workflow of workflows) {
        if (expectedWorkflows.includes(workflow.name)) {
          const webhookPath = getWebhookPath(workflow.name);
          console.log(`${workflow.name}: ${config.n8nUrl}/webhook/${webhookPath}`);
        }
      }
      
      return true;
    } else {
      console.log('⚠️  Some workflows are missing. Run with --import to set them up.');
      return false;
    }
  } catch (error) {
    console.log(`❌ Error validating setup: ${error.message}`);
    return false;
  }
}

// Get webhook path for workflow
function getWebhookPath(workflowName) {
  const pathMap = {
    'CRM - Client Onboarding Workflow': 'client-onboarding',
    'CRM - Task Management Workflow': 'task-management',
    'CRM - Communication Workflow': 'communication',
    'CRM - Reporting & Analytics Workflow': 'reporting'
  };
  return pathMap[workflowName] || 'unknown';
}

// Show help
function showHelp() {
  console.log(`
🔧 n8n CRM Workflows Setup Script

Usage:
  node setup-n8n-workflows.js [command]

Commands:
  --import     Import all CRM workflows into n8n
  --validate   Validate that workflows are properly set up
  --credential Create Supabase credential in n8n
  --help       Show this help message

Environment Variables:
  N8N_URL                    n8n instance URL (default: http://localhost:5678)
  N8N_API_KEY               n8n API key (optional, for authentication)
  N8N_WEBHOOK_API_KEY       Secure API key for webhook authentication
  SUPABASE_URL              Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY Supabase service role key
  GMAIL_CLIENT_ID           Gmail OAuth client ID
  GMAIL_CLIENT_SECRET       Gmail OAuth client secret

Examples:
  # Import workflows
  N8N_URL=https://your-n8n.com node setup-n8n-workflows.js --import
  
  # Validate setup
  node setup-n8n-workflows.js --validate
  
  # Create credentials
  SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx N8N_WEBHOOK_API_KEY=xxx node setup-n8n-workflows.js --credential
  
  # Generate secure webhook API key
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
`);
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    showHelp();
    return;
  }
  
  console.log('🚀 n8n CRM Workflows Setup');
  console.log(`📍 n8n URL: ${config.n8nUrl}`);
  console.log('');
  
  if (args.includes('--import')) {
    await importAllWorkflows();
  } else if (args.includes('--validate')) {
    await validateSetup();
  } else if (args.includes('--credential')) {
    await createSupabaseCredential();
    await createWebhookCredential();
  } else {
    console.log('❌ Unknown command. Use --help for usage information.');
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  importAllWorkflows,
  validateSetup,
  createSupabaseCredential,
  createWebhookCredential
};