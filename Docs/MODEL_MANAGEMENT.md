# Model Management Guide

## Overview

The LLM Assistant supports multiple AI providers and models through a flexible configuration system. You can add, remove, and configure models without modifying the application code.

## Configuration Files

### Default Configuration
- **Location**: `config/models.json`
- **Purpose**: Ships with the application, defines default models
- **DO NOT EDIT**: Your changes will be overwritten on updates

### User Configuration
- **Location**: `~/Library/Application Support/llm-assistant-macos/models-override.json`
- **Purpose**: Your custom model configurations
- **Safe to edit**: Persists across app updates
- **Priority**: Overrides default configuration

## Important: API Parameter Differences Between Model Families

**GPT-5 Models** use different API parameters than older models:
- Use `max_completion_tokens` instead of `max_tokens`
- Use `temperature: 1` instead of `temperature: 0.7`

**GPT-4 and Older Models**:
- Use `max_tokens`
- Support temperature range (e.g., `temperature: 0.7`)

The application automatically handles these differences based on the model name prefix.

## Adding New Models

### Method 1: Edit User Configuration File

1. Open or create the user config file:
```bash
open ~/Library/Application\ Support/llm-assistant-macos/models-override.json
```

2. Add your model:
```json
{
  "providers": {
    "openai": {
      "models": [
        {
          "id": "gpt-4o",
          "name": "GPT-4o",
          "description": "Previous generation flagship model",
          "speed": "fast",
          "quality": "excellent",
          "cost": "medium"
        }
      ]
    }
  }
}
```

3. Restart the application or reload config in Settings

### Method 2: Using Setup Wizard

```bash
npm run setup-wizard
```

The wizard now includes all new GPT-5 and GPT-4.1 models:
- GPT-5 (Full flagship model)
- GPT-5 Mini (Lightweight, optimized for speed)
- GPT-5 Nano (Most cost-effective)
- GPT-4.1 (Superior reasoning and context)
- GPT-4.1 Mini (Balanced performance)
- GPT-4.1 Nano (Simple or bulk tasks)

## Removing Models

### Disable in User Config
```json
{
  "providers": {
    "openai": {
      "models": [
        {
          "id": "gpt-5-nano",
          "enabled": false
        }
      ]
    }
  }
}
```

### Or use the API programmatically
```javascript
await window.electronAPI.removeModel('openai', 'gpt-5-nano');
```

## Enabling/Disabling Providers

### In User Config
```json
{
  "providers": {
    "anthropic": {
      "enabled": true
    },
    "perplexity": {
      "enabled": false
    }
  }
}
```

### Via API
```javascript
// Enable Claude
await window.electronAPI.setProviderEnabled('anthropic', true);

// Disable Perplexity
await window.electronAPI.setProviderEnabled('perplexity', false);
```

## Adding New Providers

Create a new provider entry in your user config:

```json
{
  "providers": {
    "custom-provider": {
      "name": "My Custom Provider",
      "enabled": true,
      "endpoint": "https://api.example.com/v1",
      "models": [
        {
          "id": "custom-model-1",
          "name": "Custom Model",
          "description": "My custom AI model",
          "speed": "medium",
          "quality": "good",
          "cost": "low",
          "default": true
        }
      ]
    }
  }
}
```

## Model Properties

Each model supports these properties:

| Property | Required | Description | Example |
|----------|----------|-------------|---------|
| `id` | Yes | Unique model identifier | `"gpt-5"` |
| `name` | Yes | Display name | `"GPT-5"` |
| `description` | No | Short description | `"Full flagship model"` |
| `speed` | No | Speed rating | `"very-fast"`, `"fast"`, `"medium"`, `"slow"` |
| `quality` | No | Quality rating | `"excellent"`, `"very-good"`, `"good"`, `"fair"` |
| `cost` | No | Cost rating | `"high"`, `"medium"`, `"low"`, `"free"` |
| `default` | No | Default for provider | `true` or `false` |
| `enabled` | No | Enable/disable model | `true` or `false` (default: true) |

## API Settings Configuration (New in v1.1.0)

You can now override API behavior settings like timeout, retries, token limits, and temperature in your `models-override.json` file.

### Available API Settings

```json
{
  "apiSettings": {
    "timeout": 60000,              // Request timeout in milliseconds (default: 60000)
    "maxRetries": 3,                // Number of retry attempts (default: 3)
    "retryDelay": 1000,             // Delay between retries in ms (default: 1000)
    "defaultMaxTokens": 1000,       // Default token limit (default: 1000)
    "defaultTemperature": 0.7,      // Default temperature (default: 0.7)
    "gpt5Settings": {
      "maxCompletionTokens": 1000,  // GPT-5 specific token parameter
      "temperature": 1              // GPT-5 requires temperature: 1
    },
    "gpt4Settings": {
      "maxTokens": 1000,            // GPT-4 token parameter
      "temperature": 0.7            // GPT-4 supports custom temperature
    }
  }
}
```

### Example: Increase Timeout and Token Limits

```json
{
  "apiSettings": {
    "timeout": 120000,
    "maxRetries": 5,
    "gpt5Settings": {
      "maxCompletionTokens": 2000
    },
    "gpt4Settings": {
      "maxTokens": 1500
    }
  }
}
```

### When to Adjust These Settings

- **Increase timeout** - For slow internet connections or complex prompts
- **Increase maxRetries** - For unreliable network connections
- **Increase token limits** - When you need longer AI responses
- **Adjust temperature** - For more creative (higher) or consistent (lower) responses

**Note:** Temperature adjustments only apply to GPT-4 and older models. GPT-5 models require `temperature: 1`.

## Configuration Merging

The user config merges with the default config:
- User config **overrides** matching entries in default config
- User config **adds** new entries not in default config
- Properties not specified in user config use default values
- **API settings** are deeply merged (can override individual nested properties)

### Example Merge

**Default config** (`config/models.json`):
```json
{
  "providers": {
    "openai": {
      "enabled": true,
      "models": [
        { "id": "gpt-5", "name": "GPT-5", "default": true },
        { "id": "gpt-5-mini", "name": "GPT-5 Mini" },
        { "id": "gpt-5-nano", "name": "GPT-5 Nano" },
        { "id": "gpt-4.1", "name": "GPT-4.1" },
        { "id": "gpt-4.1-mini", "name": "GPT-4.1 Mini" },
        { "id": "gpt-4.1-nano", "name": "GPT-4.1 Nano" }
      ]
    }
  }
}
```

**User config** (`models-override.json`):
```json
{
  "providers": {
    "openai": {
      "models": [
        { "id": "gpt-4o", "name": "GPT-4o (Legacy)", "default": true },
        { "id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo" }
      ]
    },
    "anthropic": {
      "enabled": true,
      "models": [
        { "id": "claude-3-opus-20240229", "name": "Claude 3 Opus" }
      ]
    }
  }
}
```

**Result**:
- OpenAI: gpt-5, gpt-5-mini, gpt-5-nano, gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, **gpt-4o** (added), **gpt-3.5-turbo** (added)
- Anthropic: claude-3-opus-20240229 (new provider)
- Default model changed to gpt-4o (user preference)

## Testing Changes

After modifying configuration:

1. **Reload in app**:
   - Settings → Advanced → Reload Model Config

2. **Or restart app**:
```bash
npm start
```

3. **Verify models appear**:
   - Settings → AI Model dropdown should show new models

## Troubleshooting

### Models Not Appearing

Check configuration syntax:
```bash
# Validate JSON syntax
cat ~/Library/Application\ Support/llm-assistant-macos/models-override.json | jq .
```

### Provider Not Working

1. Verify API key is set for the provider
2. Check provider is enabled: `"enabled": true`
3. Check logs: Cmd+Option+I to open DevTools

### Reset to Defaults

Remove user config:
```bash
rm ~/Library/Application\ Support/llm-assistant-macos/models-override.json
```

Then restart the app.

## Advanced: Dynamic Model Discovery

For providers that support listing models via API (like Ollama):

```json
{
  "providers": {
    "ollama": {
      "enabled": true,
      "endpoint": "http://localhost:11434",
      "autoDiscover": true,
      "models": []
    }
  },
  "preferences": {
    "autoDetectOllama": true
  }
}
```

The app will automatically discover available models on startup.

## Examples

### Add Legacy GPT-4 Models
If you want to use older OpenAI models alongside the new ones:

**Note:** GPT-4 and earlier models use `max_tokens`, while GPT-5 models use `max_completion_tokens`. The application handles this automatically.

```json
{
  "providers": {
    "openai": {
      "models": [
        {
          "id": "gpt-4o",
          "name": "GPT-4o (Legacy)",
          "description": "Previous generation flagship",
          "speed": "fast",
          "quality": "excellent",
          "cost": "medium"
        },
        {
          "id": "gpt-4-turbo",
          "name": "GPT-4 Turbo (Legacy)",
          "description": "Previous turbo model",
          "speed": "fast",
          "quality": "excellent",
          "cost": "medium"
        },
        {
          "id": "gpt-3.5-turbo",
          "name": "GPT-3.5 Turbo (Legacy)",
          "description": "Older fast model",
          "speed": "very-fast",
          "quality": "good",
          "cost": "low"
        }
      ]
    }
  }
}
```

### Change Default Model to GPT-5 Mini
```json
{
  "providers": {
    "openai": {
      "models": [
        {
          "id": "gpt-5",
          "default": false
        },
        {
          "id": "gpt-5-mini",
          "default": true
        }
      ]
    }
  }
}
```

### Disable Nano Models (Keep Only Full and Mini)
```json
{
  "providers": {
    "openai": {
      "models": [
        {
          "id": "gpt-5-nano",
          "enabled": false
        },
        {
          "id": "gpt-4.1-nano",
          "enabled": false
        }
      ]
    }
  }
}
```

### Enable Claude
```json
{
  "providers": {
    "anthropic": {
      "enabled": true
    }
  }
}
```

### Add Custom Ollama Model
```json
{
  "providers": {
    "ollama": {
      "enabled": true,
      "models": [
        {
          "id": "codellama:34b",
          "name": "Code Llama 34B",
          "description": "Specialized for coding",
          "speed": "medium",
          "quality": "excellent",
          "cost": "free"
        }
      ]
    }
  }
}
```

## Best Practices

1. **Keep user config minimal** - Only override what you need
2. **Test new models** - Verify they work before relying on them
3. **Document custom models** - Note why you added them
4. **Backup your config** - Save `models-override.json` before major changes
5. **Check for updates** - New models may be added to default config

## Related Documentation

- [SETUP.md](SETUP.md) - Initial setup guide
- [API-KEYS.md](API-KEYS.md) - Managing API keys for different providers
- [config/models.json](../config/models.json) - Default model configuration
