# Model Management Quick Reference

## Summary

Your LLM Assistant now has a **configurable model system** that allows adding/removing models without changing code.

## Key Files

| File | Purpose | Edit? |
|------|---------|-------|
| `config/models.json` | Default models (ships with app) | ❌ No - overwritten on updates |
| `~/Library/Application Support/llm-assistant-macos/models-override.json` | User custom models | ✅ Yes - persists across updates |
| `src/main/modelManager.js` | Model management logic | ❌ No - unless adding features |
| `docs/MODEL_MANAGEMENT.md` | User documentation | 📖 Read for details |

## Current Models (GPT-5 Series + GPT-4.1 Series)

### OpenAI Models (Default)
- **gpt-5** ⭐ (default) - Full flagship model
- **gpt-5-mini** - Lightweight, optimized for speed
- **gpt-5-nano** - Most cost-effective
- **gpt-4.1** - Superior reasoning and context
- **gpt-4.1-mini** - Balanced performance
- **gpt-4.1-nano** - Simple or bulk tasks

### Other Providers (Disabled by default)
- **Anthropic Claude** - Enable in config
- **Perplexity** - Enable in config
- **Ollama** - Enable in config (local)

## Quick Tasks

### Add a Legacy Model (e.g., GPT-4o)

Create or edit `~/Library/Application Support/llm-assistant-macos/models-override.json`:

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
        }
      ]
    }
  }
}
```

Restart the app.

### Remove a Model (e.g., GPT-5 Nano)

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

### Add Custom Model

```json
{
  "providers": {
    "openai": {
      "models": [
        {
          "id": "your-custom-model-id",
          "name": "Custom Model Name",
          "description": "Your description",
          "speed": "fast",
          "quality": "excellent",
          "cost": "medium"
        }
      ]
    }
  }
}
```

## Command Reference

```bash
# Start app and test models
npm run dev

# Validate your config JSON
cat ~/Library/Application\ Support/llm-assistant-macos/models-override.json | jq .

# Reset to defaults (removes user config)
rm ~/Library/Application\ Support/llm-assistant-macos/models-override.json

# Run setup wizard with new models
npm run setup-wizard
```

## API Usage (DevTools Console)

```javascript
// Get all available models
await window.electronAPI.getAvailableModels()

// Get enabled providers
await window.electronAPI.getEnabledProviders()

// Enable a provider
await window.electronAPI.setProviderEnabled('anthropic', true)

// Reload configuration
await window.electronAPI.reloadModelConfig()

// Add custom model programmatically
await window.electronAPI.addCustomModel('openai', {
  id: 'custom-model',
  name: 'My Custom Model',
  description: 'Custom description'
})
```

## Model ID Format

Models use the format: `provider:model-id`

Examples:
- `openai:gpt-5`
- `openai:gpt-5-mini`
- `anthropic:claude-3-opus-20240229`
- `ollama:llama2`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Models not loading | Check DevTools console for errors |
| New model not appearing | Validate JSON syntax with `jq` |
| Wrong default model | Check `"default": true` in config |
| Provider not working | Verify `"enabled": true` |
| Changes not applying | Restart the app |

## Configuration Priority

1. **User config** (`models-override.json`) - Highest priority
2. **Default config** (`config/models.json`) - Fallback
3. **Hardcoded fallback** - If both fail

## Best Practices

✅ **DO:**
- Keep user config minimal (only override what you need)
- Test new models before relying on them
- Backup your `models-override.json`
- Use valid JSON syntax

❌ **DON'T:**
- Edit `config/models.json` directly (will be overwritten)
- Add sensitive data to configs
- Use invalid JSON syntax
- Forget to restart after changes

## Implementation Notes

### Constructor Pattern
The `AssistantPanel` class uses a constructor pattern (not an `init()` method):

```javascript
constructor() {
    // ...
    this.initializeElements();
    this.bindEvents();
    this.loadAvailableModels();  // ← Add this line
    this.loadSettings();
    // ...
}
```

### File Locations
- Main process: `src/main/main.js`
- Preload bridge: `src/preload/preload.js`
- Renderer logic: `src/renderer/js/assistant.js`
- UI template: `src/renderer/assistant.html`
- Model config: `config/models.json`
- User override: `~/Library/Application Support/llm-assistant-macos/models-override.json`

## Version Info

- **Current**: v0.3.0 with configurable models
- **Model Config**: v1.0
- **Supported Providers**: OpenAI, Anthropic, Perplexity, Ollama
