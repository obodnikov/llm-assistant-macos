# Model Management Implementation Guide

This guide shows how to integrate the configurable model management system into your existing LLM Assistant codebase.

## Files to Create

### 1. Create `config/models.json`

**Location**: `config/models.json`

```json
{
  "providers": {
    "openai": {
      "name": "OpenAI",
      "enabled": true,
      "models": [
        {
          "id": "gpt-5",
          "name": "GPT-5",
          "description": "Full flagship model, highest quality",
          "speed": "medium",
          "quality": "excellent",
          "cost": "high",
          "default": true
        },
        {
          "id": "gpt-5-mini",
          "name": "GPT-5 Mini",
          "description": "Lightweight version, optimized for speed",
          "speed": "fast",
          "quality": "excellent",
          "cost": "medium"
        },
        {
          "id": "gpt-5-nano",
          "name": "GPT-5 Nano",
          "description": "Most lightweight and cost-effective",
          "speed": "very-fast",
          "quality": "good",
          "cost": "low"
        },
        {
          "id": "gpt-4.1",
          "name": "GPT-4.1",
          "description": "Full version, superior reasoning and context",
          "speed": "medium",
          "quality": "excellent",
          "cost": "high"
        },
        {
          "id": "gpt-4.1-mini",
          "name": "GPT-4.1 Mini",
          "description": "Simplified version, speed and cost optimized",
          "speed": "fast",
          "quality": "very-good",
          "cost": "medium"
        },
        {
          "id": "gpt-4.1-nano",
          "name": "GPT-4.1 Nano",
          "description": "Micro-model for simple or bulk tasks",
          "speed": "very-fast",
          "quality": "good",
          "cost": "low"
        }
      ]
    },
    "anthropic": {
      "name": "Anthropic Claude",
      "enabled": false,
      "models": [
        {
          "id": "claude-3-opus-20240229",
          "name": "Claude 3 Opus",
          "description": "Most capable Claude model",
          "speed": "medium",
          "quality": "excellent",
          "cost": "high"
        },
        {
          "id": "claude-3-sonnet-20240229",
          "name": "Claude 3 Sonnet",
          "description": "Balanced performance",
          "speed": "fast",
          "quality": "excellent",
          "cost": "medium",
          "default": true
        },
        {
          "id": "claude-3-haiku-20240307",
          "name": "Claude 3 Haiku",
          "description": "Fast and cost-effective",
          "speed": "very-fast",
          "quality": "good",
          "cost": "low"
        }
      ]
    },
    "perplexity": {
      "name": "Perplexity",
      "enabled": false,
      "models": [
        {
          "id": "pplx-7b-online",
          "name": "Perplexity 7B Online",
          "description": "Real-time web search",
          "speed": "fast",
          "quality": "good",
          "cost": "low",
          "default": true
        },
        {
          "id": "pplx-70b-online",
          "name": "Perplexity 70B Online",
          "description": "Advanced with web search",
          "speed": "medium",
          "quality": "excellent",
          "cost": "medium"
        }
      ]
    },
    "ollama": {
      "name": "Ollama (Local)",
      "enabled": false,
      "endpoint": "http://localhost:11434",
      "models": [
        {
          "id": "llama2",
          "name": "Llama 2",
          "description": "Local processing",
          "speed": "varies",
          "quality": "good",
          "cost": "free",
          "default": true
        },
        {
          "id": "mistral",
          "name": "Mistral",
          "description": "Local processing",
          "speed": "varies",
          "quality": "good",
          "cost": "free"
        }
      ]
    }
  },
  "preferences": {
    "defaultProvider": "openai",
    "autoDetectOllama": true,
    "fallbackProvider": "openai"
  }
}
```

### 2. Create `src/main/modelManager.js`

**Location**: `src/main/modelManager.js`

Copy the `modelManager.js` code from the artifact already created.

### 3. Update `src/main/main.js`

Add these imports at the top:

```javascript
const modelManager = require('./modelManager');
```

Update the AI processing handler to parse model IDs correctly and handle different API parameters:

```javascript
ipcMain.handle('process-ai', async (event, text, prompt, context) => {
  // ... existing validation code ...

  try {
    const modelFullId = store.get('ai-model', 'gpt-4');

    // Parse model ID to extract the actual model name for the API
    // Format: "provider:model-id" -> extract just "model-id"
    const model = modelFullId.includes(':')
      ? modelFullId.split(':').slice(1).join(':')
      : modelFullId;

    // Build system prompt based on context using configurable prompts
    let systemPrompt = store.get('prompt-system', 'You are a helpful AI assistant for email and text processing.');

    if (context && context.type === 'compose') {
      const composeAddition = store.get('prompt-compose', 'The user is composing an email. Provide concise, professional assistance.');
      systemPrompt += ' ' + composeAddition;
    } else if (context && context.type === 'mailbox') {
      const mailboxAddition = store.get('prompt-mailbox', 'The user is working with email threads. Help them understand and respond to conversations.');
      systemPrompt += ' ' + mailboxAddition;
    }

    systemPrompt += ' Keep responses concise and actionable.';

    // Prepare messages array
    // ... existing message preparation code ...

    // GPT-5 models use max_completion_tokens and temperature: 1
    // GPT-4 and older use max_tokens and support temperature range
    const isGPT5 = model.startsWith('gpt-5');
    const apiParams = isGPT5
      ? { max_completion_tokens: 1000, temperature: 1 }
      : { max_tokens: 1000, temperature: 0.7 };

    const response = await openaiClient.chat.completions.create({
      model: model,
      messages: messages,
      ...apiParams
    });

    return response.choices[0].message.content;
  } catch (error) {
    // ... existing error handling ...
  }
});
```

Add these IPC handlers (find the section with other `ipcMain.handle()` calls):

```javascript
// Model management IPC handlers
ipcMain.handle('get-available-models', async () => {
  return modelManager.getAvailableModels();
});

ipcMain.handle('get-provider-models', async (event, providerId) => {
  return modelManager.getProviderModels(providerId);
});

ipcMain.handle('get-enabled-providers', async () => {
  return modelManager.getEnabledProviders();
});

ipcMain.handle('set-provider-enabled', async (event, providerId, enabled) => {
  modelManager.setProviderEnabled(providerId, enabled);
  return true;
});

ipcMain.handle('add-custom-model', async (event, providerId, model) => {
  try {
    modelManager.addModel(providerId, model);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('remove-model', async (event, providerId, modelId) => {
  try {
    modelManager.removeModel(providerId, modelId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reload-model-config', async () => {
  modelManager.loadConfig();
  return modelManager.getAvailableModels();
});
```

### 4. Update `src/preload/preload.js`

Add these methods to the `electronAPI` object:

```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing methods ...
  
  // Model management APIs
  getAvailableModels: () => ipcRenderer.invoke('get-available-models'),
  getProviderModels: (providerId) => ipcRenderer.invoke('get-provider-models', providerId),
  getEnabledProviders: () => ipcRenderer.invoke('get-enabled-providers'),
  setProviderEnabled: (providerId, enabled) => ipcRenderer.invoke('set-provider-enabled', providerId, enabled),
  addCustomModel: (providerId, model) => ipcRenderer.invoke('add-custom-model', providerId, model),
  removeModel: (providerId, modelId) => ipcRenderer.invoke('remove-model', providerId, modelId),
  reloadModelConfig: () => ipcRenderer.invoke('reload-model-config')
});
```

### 5. Update `src/renderer/js/assistant.js`

**Step A:** Add these methods to the `AssistantPanel` class (add them after the `constructor()` method):

```javascript
async loadAvailableModels() {
  try {
    if (!window.electronAPI?.getAvailableModels) {
      console.warn('getAvailableModels API not available');
      return;
    }

    const models = await window.electronAPI.getAvailableModels();
    this.populateModelSelect(models);
  } catch (error) {
    console.error('Failed to load models:', error);
  }
}

populateModelSelect(models) {
  const modelSelect = document.getElementById('model-select');
  if (!modelSelect) return;

  // Clear existing options
  modelSelect.innerHTML = '';

  // Group models by provider
  const groupedModels = {};
  models.forEach(model => {
    if (!groupedModels[model.providerName]) {
      groupedModels[model.providerName] = [];
    }
    groupedModels[model.providerName].push(model);
  });

  // Add options grouped by provider
  Object.entries(groupedModels).forEach(([providerName, providerModels]) => {
    if (Object.keys(groupedModels).length > 1) {
      // Add optgroup only if multiple providers
      const optgroup = document.createElement('optgroup');
      optgroup.label = providerName;
      
      providerModels.forEach(model => {
        const option = this.createModelOption(model);
        optgroup.appendChild(option);
      });
      
      modelSelect.appendChild(optgroup);
    } else {
      // Single provider, no optgroup needed
      providerModels.forEach(model => {
        const option = this.createModelOption(model);
        modelSelect.appendChild(option);
      });
    }
  });
}

createModelOption(model) {
  const option = document.createElement('option');
  option.value = model.fullId;
  
  // Format: "GPT-5 - Full flagship model, highest quality"
  option.textContent = `${model.name}${model.description ? ' - ' + model.description : ''}`;
  
  // Add data attributes for additional info
  option.dataset.speed = model.speed;
  option.dataset.quality = model.quality;
  option.dataset.cost = model.cost;
  
  return option;
}
```

**Step B:** Update the `constructor()` method to call `loadAvailableModels()`:

Find this section in the constructor:
```javascript
constructor() {
    this.currentContext = null;
    this.isProcessing = false;
    this.settings = {};
    
    // Simple initialization - no complex waiting
    this.initializeElements();
    this.bindEvents();
    this.loadSettings();
    this.updateTheme();
    this.checkMailContext();
```

Change it to:
```javascript
constructor() {
    this.currentContext = null;
    this.isProcessing = false;
    this.settings = {};
    
    // Simple initialization - no complex waiting
    this.initializeElements();
    this.bindEvents();
    this.loadAvailableModels();  // ← ADD THIS LINE
    this.loadSettings();
    this.updateTheme();
    this.checkMailContext();
```

### 6. Update `src/renderer/assistant.html`

Replace the hardcoded model dropdown with:

```html
<div class="setting-group">
    <label for="model-select">AI Model:</label>
    <select id="model-select">
        <!-- Models will be loaded dynamically -->
        <option value="">Loading models...</option>
    </select>
    <small class="help-text">Models are loaded from config/models.json</small>
</div>
```

### 7. Update `scripts/setup-wizard.js`

Update the `setupModel()` function to include new models:

```javascript
async function setupModel() {
  console.log('Step 3: AI Model Selection\n');

  console.log('Available OpenAI models:');
  console.log('1. GPT-5 (recommended) - Full flagship model');
  console.log('2. GPT-5 Mini - Lightweight, optimized for speed');
  console.log('3. GPT-5 Nano - Most cost-effective');
  console.log('4. GPT-4.1 - Superior reasoning and context');
  console.log('5. GPT-4.1 Mini - Balanced performance');
  console.log('6. GPT-4.1 Nano - Simple or bulk tasks\n');

  const modelChoice = await askQuestion('Choose model (1-6) [1]: ') || '1';

  const models = {
    '1': 'gpt-5',
    '2': 'gpt-5-mini',
    '3': 'gpt-5-nano',
    '4': 'gpt-4.1',
    '5': 'gpt-4.1-mini',
    '6': 'gpt-4.1-nano'
  };

  config.model = models[modelChoice] || 'gpt-5';
  console.log(`✅ Selected model: ${config.model}\n`);
}
```

Also update the `testConfiguration()` function to handle GPT-5's different API parameters:

```javascript
async function testConfiguration() {
  console.log('\nStep 5: Testing Configuration\n');
  console.log('Testing OpenAI connection...');

  try {
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey: config.openaiApiKey });

    // GPT-5 models use max_completion_tokens, GPT-4 and older use max_tokens
    const isGPT5 = config.model.startsWith('gpt-5');
    const tokenParams = isGPT5
      ? { max_completion_tokens: 50 }
      : { max_tokens: 50 };

    const response = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: 'Say "Hello from LLM Assistant!"' }],
      ...tokenParams
    });

    console.log('✅ OpenAI connection successful!');
    console.log(`Response: ${response.choices[0].message.content}\n`);
  } catch (error) {
    console.error('❌ OpenAI test failed:', error.message);
    throw error;
  }
}
```

## Testing the Implementation

### 1. Test Model Loading

```bash
# Start the app in dev mode
npm run dev

# Check the console for:
# - "Loading available models..."
# - Models should appear in the settings dropdown
```

### 2. Test User Config Override

Create `~/Library/Application Support/llm-assistant-macos/models-override.json`:

```json
{
  "providers": {
    "openai": {
      "models": [
        {
          "id": "gpt-4o",
          "name": "GPT-4o (Legacy)",
          "description": "Previous generation model",
          "default": true
        }
      ]
    }
  }
}
```

Restart the app and verify the new model appears.

### 3. Test Provider Management

In the DevTools console:

```javascript
// Get all available models
const models = await window.electronAPI.getAvailableModels();
console.log(models);

// Enable Claude provider
await window.electronAPI.setProviderEnabled('anthropic', true);

// Reload configuration
await window.electronAPI.reloadModelConfig();
```

## Directory Structure After Implementation

```
llm-assistant-macos/
├── config/
│   ├── models.json              # ← NEW: Model configuration
│   ├── config.example.json
│   └── privacy-patterns.json
├── src/
│   ├── main/
│   │   ├── main.js              # ← UPDATED: Add IPC handlers
│   │   └── modelManager.js      # ← NEW: Model management logic
│   ├── renderer/
│   │   ├── assistant.html       # ← UPDATED: Dynamic model dropdown
│   │   └── js/
│   │       └── assistant.js     # ← UPDATED: Load models dynamically
│   └── preload/
│       └── preload.js           # ← UPDATED: Expose model APIs
├── scripts/
│   └── setup-wizard.js          # ← UPDATED: Use new model IDs
├── docs/
│   └── MODEL_MANAGEMENT.md      # ← NEW: User documentation
└── ~/Library/Application Support/llm-assistant-macos/
    └── models-override.json     # User's custom models (created by user)
```

## Rollback Plan

If you need to revert the changes:

1. Remove `src/main/modelManager.js`
2. Remove `config/models.json`
3. Remove model-related IPC handlers from `main.js`
4. Remove model APIs from `preload.js`
5. Restore hardcoded dropdown in `assistant.html`:

```html
<select id="model-select">
    <option value="gpt-4">GPT-4</option>
    <option value="gpt-4-turbo">GPT-4 Turbo</option>
    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
</select>
```

## Next Steps

After implementing:

1. ✅ Test with `npm run dev`
2. ✅ Verify models load in Settings
3. ✅ Test user config override
4. ✅ Update documentation
5. ✅ Commit changes to git

## Support

If you encounter issues:
- Check DevTools console for errors
- Verify `config/models.json` is valid JSON
- Ensure `src/main/modelManager.js` exists
- Check IPC handlers are registered in `main.js`
