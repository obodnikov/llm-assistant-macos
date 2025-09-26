#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
┌─────────────────────────────────────────────────┐
│                                                 │
│           🤖 LLM Assistant Setup                │
│                                                 │
│     AI-powered assistant for macOS              │
│     with Mail.app integration                   │
│                                                 │
└─────────────────────────────────────────────────┘

Welcome! Let's set up your LLM Assistant.

This wizard will help you:
• Configure your OpenAI API key
• Set up privacy preferences
• Test the installation

`);

const config = {};

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function setupApiKey() {
  console.log('Step 1: OpenAI API Key Configuration\n');
  
  console.log('You need an OpenAI API key to use this assistant.');
  console.log('Get one at: https://platform.openai.com/api-keys\n');
  
  const apiKey = await askQuestion('Enter your OpenAI API key (sk-...): ');
  
  if (!apiKey || !apiKey.startsWith('sk-')) {
    console.log('⚠️  Invalid API key format. Please make sure it starts with "sk-"');
    return setupApiKey();
  }
  
  config.openaiApiKey = apiKey;
  console.log('✅ API key configured\n');
}

async function setupPrivacy() {
  console.log('Step 2: Privacy Settings\n');
  
  console.log('The assistant can filter sensitive content before sending to AI:');
  console.log('• API keys and tokens');
  console.log('• Login credentials');
  console.log('• Financial information (credit cards, SSN, etc.)');
  console.log('• Email addresses and phone numbers\n');
  
  const filterSensitive = await askQuestion('Enable privacy filtering? (Y/n): ');
  
  config.privacyFiltering = filterSensitive.toLowerCase() !== 'n';
  
  if (config.privacyFiltering) {
    console.log('✅ Privacy filtering enabled');
    console.log('   Sensitive content will be highlighted and filtered\n');
  } else {
    console.log('⚠️  Privacy filtering disabled\n');
  }
}

async function setupModel() {
  console.log('Step 3: AI Model Selection\n');
  
  console.log('Available models:');
  console.log('1. GPT-4 (recommended) - Most capable, higher cost');
  console.log('2. GPT-4 Turbo - Faster, good balance');
  console.log('3. GPT-3.5 Turbo - Fastest, lower cost\n');
  
  const modelChoice = await askQuestion('Choose model (1-3) [1]: ') || '1';
  
  const models = {
    '1': 'gpt-4',
    '2': 'gpt-4-turbo',
    '3': 'gpt-3.5-turbo'
  };
  
  config.model = models[modelChoice] || 'gpt-4';
  console.log(`✅ Selected model: ${config.model}\n`);
}

async function testConfiguration() {
  console.log('Step 4: Testing Configuration\n');
  
  const shouldTest = await askQuestion('Test the configuration now? (Y/n): ');
  
  if (shouldTest.toLowerCase() === 'n') {
    console.log('⏭️  Skipping test\n');
    return;
  }
  
  console.log('🧪 Testing OpenAI connection...');
  
  try {
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey: config.openaiApiKey });
    
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: 'Say "Hello from LLM Assistant!"' }],
      max_tokens: 50
    });
    
    console.log('✅ OpenAI connection successful!');
    console.log(`   Response: ${response.choices[0].message.content}\n`);
    
  } catch (error) {
    console.log('❌ OpenAI connection failed:');
    console.log(`   Error: ${error.message}\n`);
    
    const retry = await askQuestion('Retry with a different API key? (y/N): ');
    if (retry.toLowerCase() === 'y') {
      return setupApiKey().then(() => testConfiguration());
    }
  }
}

function saveConfiguration() {
  console.log('Step 5: Saving Configuration\n');
  
  const configPath = path.join(__dirname, '..', 'config', 'config.json');
  const configDir = path.dirname(configPath);
  
  // Create config directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const configData = {
    'openai-api-key': config.openaiApiKey,
    'ai-model': config.model,
    'filter-api-keys': config.privacyFiltering,
    'filter-credentials': config.privacyFiltering,
    'filter-financial': config.privacyFiltering,
    'setup-completed': true,
    'setup-date': new Date().toISOString()
  };
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
    console.log('✅ Configuration saved successfully\n');
  } catch (error) {
    console.log('⚠️  Could not save configuration file:');
    console.log(`   ${error.message}`);
    console.log('   You can manually configure these settings in the app.\n');
  }
}

function showNextSteps() {
  console.log(`
┌─────────────────────────────────────────────────┐
│                  🎉 Setup Complete!             │
└─────────────────────────────────────────────────┘

Your LLM Assistant is ready to use!

Next steps:
1. Start the app:
   npm start

2. Use the global hotkey:
   Cmd + Option + L

3. Open Mail.app and try the assistant with:
   • Email composition
   • Email thread analysis
   • Text selection anywhere

Features you can try:
• Quick actions: Summarize, Translate, Improve
• Mail context detection
• Privacy filtering
• Custom prompts

Need help? Check the documentation:
• README.md - Getting started
• docs/SETUP.md - Detailed setup guide
• docs/PRIVACY.md - Privacy features

Happy emailing! 🚀
`);
}

async function main() {
  try {
    await setupApiKey();
    await setupPrivacy();
    await setupModel();
    await testConfiguration();
    saveConfiguration();
    showNextSteps();
    
  } catch (error) {
    console.log('\n❌ Setup failed:', error.message);
    console.log('Please try running the setup again.\n');
  } finally {
    rl.close();
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Setup cancelled. You can run this again anytime with: npm run setup-wizard\n');
  rl.close();
  process.exit(0);
});

main();