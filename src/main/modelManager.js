const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ModelManager {
  constructor() {
    this.configPath = path.join(__dirname, '../../config/models.json');
    this.userConfigPath = path.join(
      app.getPath('userData'),
      'models-override.json'
    );
    this.config = null;
  }

  /**
   * Load model configuration from files
   * User config overrides default config
   */
  loadConfig() {
    try {
      // Load default config
      const defaultConfig = JSON.parse(
        fs.readFileSync(this.configPath, 'utf8')
      );

      // Check for user override config
      if (fs.existsSync(this.userConfigPath)) {
        const userConfig = JSON.parse(
          fs.readFileSync(this.userConfigPath, 'utf8')
        );
        
        // Merge configs (user config takes precedence)
        this.config = this.mergeConfigs(defaultConfig, userConfig);
      } else {
        this.config = defaultConfig;
      }

      return this.config;
    } catch (error) {
      console.error('Failed to load model config:', error);
      // Return minimal fallback config
      return this.getFallbackConfig();
    }
  }

  /**
   * Merge user config with default config
   */
  mergeConfigs(defaultConfig, userConfig) {
    const merged = JSON.parse(JSON.stringify(defaultConfig));

    // Merge providers
    if (userConfig.providers) {
      Object.keys(userConfig.providers).forEach(providerId => {
        if (merged.providers[providerId]) {
          merged.providers[providerId] = {
            ...merged.providers[providerId],
            ...userConfig.providers[providerId]
          };
        } else {
          // Add new provider
          merged.providers[providerId] = userConfig.providers[providerId];
        }
      });
    }

    // Merge preferences
    if (userConfig.preferences) {
      merged.preferences = {
        ...merged.preferences,
        ...userConfig.preferences
      };
    }

    return merged;
  }

  /**
   * Get all available models across all enabled providers
   */
  getAvailableModels() {
    if (!this.config) {
      this.loadConfig();
    }

    const models = [];
    
    Object.entries(this.config.providers).forEach(([providerId, provider]) => {
      if (provider.enabled) {
        provider.models.forEach(model => {
          models.push({
            ...model,
            provider: providerId,
            providerName: provider.name,
            fullId: `${providerId}:${model.id}`
          });
        });
      }
    });

    return models;
  }

  /**
   * Get models for a specific provider
   */
  getProviderModels(providerId) {
    if (!this.config) {
      this.loadConfig();
    }

    const provider = this.config.providers[providerId];
    if (!provider || !provider.enabled) {
      return [];
    }

    return provider.models.map(model => ({
      ...model,
      provider: providerId,
      providerName: provider.name,
      fullId: `${providerId}:${model.id}`
    }));
  }

  /**
   * Get default model for a provider
   */
  getDefaultModel(providerId = null) {
    if (!this.config) {
      this.loadConfig();
    }

    const targetProvider = providerId || this.config.preferences.defaultProvider;
    const provider = this.config.providers[targetProvider];

    if (!provider || !provider.enabled) {
      return null;
    }

    const defaultModel = provider.models.find(m => m.default);
    return defaultModel ? {
      ...defaultModel,
      provider: targetProvider,
      providerName: provider.name,
      fullId: `${targetProvider}:${defaultModel.id}`
    } : null;
  }

  /**
   * Parse full model ID (provider:model-id)
   */
  parseModelId(fullId) {
    const [provider, ...modelParts] = fullId.split(':');
    return {
      provider,
      modelId: modelParts.join(':')
    };
  }

  /**
   * Enable/disable a provider
   */
  setProviderEnabled(providerId, enabled) {
    if (!this.config) {
      this.loadConfig();
    }

    if (this.config.providers[providerId]) {
      this.config.providers[providerId].enabled = enabled;
      this.saveUserConfig();
    }
  }

  /**
   * Add a new model to a provider
   */
  addModel(providerId, model) {
    if (!this.config) {
      this.loadConfig();
    }

    if (!this.config.providers[providerId]) {
      throw new Error(`Provider ${providerId} not found`);
    }

    this.config.providers[providerId].models.push(model);
    this.saveUserConfig();
  }

  /**
   * Remove a model from a provider
   */
  removeModel(providerId, modelId) {
    if (!this.config) {
      this.loadConfig();
    }

    const provider = this.config.providers[providerId];
    if (!provider) {
      return;
    }

    provider.models = provider.models.filter(m => m.id !== modelId);
    this.saveUserConfig();
  }

  /**
   * Save user configuration
   */
  saveUserConfig() {
    try {
      fs.writeFileSync(
        this.userConfigPath,
        JSON.stringify(this.config, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Failed to save user config:', error);
    }
  }

  /**
   * Get fallback config if loading fails
   */
  getFallbackConfig() {
    return {
      providers: {
        openai: {
          name: "OpenAI",
          enabled: true,
          models: [
            {
              id: "gpt-4o",
              name: "GPT-4o",
              description: "Most capable",
              default: true
            }
          ]
        }
      },
      preferences: {
        defaultProvider: "openai"
      }
    };
  }

  /**
   * Get enabled providers
   */
  getEnabledProviders() {
    if (!this.config) {
      this.loadConfig();
    }

    return Object.entries(this.config.providers)
      .filter(([_, provider]) => provider.enabled)
      .map(([id, provider]) => ({
        id,
        name: provider.name,
        modelCount: provider.models.length
      }));
  }
}

// Export singleton instance
module.exports = new ModelManager();
