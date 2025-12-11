# Release Notes - Version 1.1.0

**Release Date:** December 11, 2025
**Previous Version:** 1.0.0

## What's New

### Configurable API Settings
All timeout, retry, and token settings are now configurable via `models-override.json`:
- Request timeout (default: 60 seconds)
- Retry attempts (default: 3)
- Token limits per model
- Temperature settings
- **Supports user overrides** - persists across app updates

### Enhanced Error Messages
Clear, actionable error messages for all failure scenarios:
- Authentication failures
- Network errors
- Timeouts
- Rate limits
- Service unavailability

### Better User Experience
- No more indefinite "Processing..." states
- Guaranteed timeout with clear feedback
- Automatic retries for transient failures
- Users always know why processing failed

## Configuration Example

Create or edit `~/Library/Application Support/llm-assistant-macos/models-override.json`:

```json
{
  "apiSettings": {
    "timeout": 90000,
    "maxRetries": 5,
    "gpt5Settings": {
      "maxCompletionTokens": 2000,
      "temperature": 1
    },
    "gpt4Settings": {
      "maxTokens": 1500,
      "temperature": 0.8
    }
  }
}
```

**Note:** The `models-override.json` file allows you to override default settings without modifying `config/models.json`. Your custom settings persist across app updates.

## Migration

No action required - all changes are backward compatible with existing configurations.

## Bug Fixes

- Fixed issue where AI returned nothing with no user feedback
- Fixed indefinite hangs when API service is slow
- Improved error handling for network failures

## Technical Details

See [change_tracker/Release_v1.1.0.md](../change_tracker/Release_v1.1.0.md) for complete technical documentation.
