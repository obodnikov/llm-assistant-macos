/**
 * Unit tests for src/main/modelManager.js
 * Spec: Docs/TEST_PLAN.md Section 7 (modelManager coverage)
 *
 * modelManager exports a singleton. We use jest.isolateModules to get
 * a fresh instance per test group, and mock fs for file operations.
 */

const fs = require('fs');
const path = require('path');

jest.mock('fs');

// Helper: get a fresh ModelManager instance (avoids singleton state leaking)
function freshManager() {
  let manager;
  jest.isolateModules(() => {
    manager = require('../../src/main/modelManager');
  });
  return manager;
}

// Minimal valid config for tests
const defaultConfig = {
  providers: {
    openai: {
      name: 'OpenAI',
      enabled: true,
      models: [
        { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable', default: true },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast', default: false }
      ]
    },
    anthropic: {
      name: 'Anthropic',
      enabled: false,
      models: [
        { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', description: 'Balanced', default: true }
      ]
    }
  },
  preferences: {
    defaultProvider: 'openai'
  },
  apiSettings: {
    timeout: 60000,
    gpt5Settings: { maxCompletionTokens: 1000, temperature: 1 },
    gpt4Settings: { maxTokens: 1000, temperature: 0.7 }
  }
};

beforeEach(() => {
  jest.clearAllMocks();
});

// --- parseModelId (pure function) ---

describe('parseModelId', () => {
  test('parses simple provider:model format', () => {
    const manager = freshManager();
    expect(manager.parseModelId('openai:gpt-4o')).toEqual({
      provider: 'openai',
      modelId: 'gpt-4o'
    });
  });

  test('handles model ID with colons (e.g. anthropic:claude-3:latest)', () => {
    const manager = freshManager();
    expect(manager.parseModelId('anthropic:claude-3:latest')).toEqual({
      provider: 'anthropic',
      modelId: 'claude-3:latest'
    });
  });

  test('handles ID with no colon', () => {
    const manager = freshManager();
    expect(manager.parseModelId('gpt-4o')).toEqual({
      provider: 'gpt-4o',
      modelId: ''
    });
  });
});

// --- getFallbackConfig (pure function) ---

describe('getFallbackConfig', () => {
  test('returns config with openai provider enabled', () => {
    const manager = freshManager();
    const fallback = manager.getFallbackConfig();
    expect(fallback.providers.openai).toBeDefined();
    expect(fallback.providers.openai.enabled).toBe(true);
  });

  test('returns config with a default model', () => {
    const manager = freshManager();
    const fallback = manager.getFallbackConfig();
    const defaultModel = fallback.providers.openai.models.find(m => m.default);
    expect(defaultModel).toBeDefined();
    expect(defaultModel.id).toBe('gpt-4o');
  });

  test('returns config with defaultProvider preference', () => {
    const manager = freshManager();
    const fallback = manager.getFallbackConfig();
    expect(fallback.preferences.defaultProvider).toBe('openai');
  });
});

// --- mergeConfigs ---

describe('mergeConfigs', () => {
  test('user provider overrides merge onto default provider', () => {
    const manager = freshManager();
    const userConfig = {
      providers: {
        openai: { enabled: false }
      }
    };
    const merged = manager.mergeConfigs(defaultConfig, userConfig);
    expect(merged.providers.openai.enabled).toBe(false);
    // Name should still come from default (spread order)
    expect(merged.providers.openai.name).toBe('OpenAI');
  });

  test('user can add a new provider', () => {
    const manager = freshManager();
    const userConfig = {
      providers: {
        custom: { name: 'Custom', enabled: true, models: [] }
      }
    };
    const merged = manager.mergeConfigs(defaultConfig, userConfig);
    expect(merged.providers.custom).toBeDefined();
    expect(merged.providers.custom.name).toBe('Custom');
    // Original providers untouched
    expect(merged.providers.openai).toBeDefined();
  });

  test('user preferences merge onto defaults', () => {
    const manager = freshManager();
    const userConfig = {
      preferences: { defaultProvider: 'anthropic', customPref: true }
    };
    const merged = manager.mergeConfigs(defaultConfig, userConfig);
    expect(merged.preferences.defaultProvider).toBe('anthropic');
    expect(merged.preferences.customPref).toBe(true);
  });

  test('apiSettings deep merges gpt5Settings and gpt4Settings', () => {
    const manager = freshManager();
    const userConfig = {
      apiSettings: {
        timeout: 30000,
        gpt5Settings: { maxCompletionTokens: 2000 }
      }
    };
    const merged = manager.mergeConfigs(defaultConfig, userConfig);
    expect(merged.apiSettings.timeout).toBe(30000);
    expect(merged.apiSettings.gpt5Settings.maxCompletionTokens).toBe(2000);
    // temperature preserved from default
    expect(merged.apiSettings.gpt5Settings.temperature).toBe(1);
    // gpt4Settings untouched
    expect(merged.apiSettings.gpt4Settings.maxTokens).toBe(1000);
  });

  test('does not mutate the original default config', () => {
    const manager = freshManager();
    const original = JSON.parse(JSON.stringify(defaultConfig));
    const userConfig = { providers: { openai: { enabled: false } } };
    manager.mergeConfigs(defaultConfig, userConfig);
    expect(defaultConfig).toEqual(original);
  });

  test('handles empty user config gracefully', () => {
    const manager = freshManager();
    const merged = manager.mergeConfigs(defaultConfig, {});
    expect(merged.providers.openai.enabled).toBe(true);
    expect(merged.preferences.defaultProvider).toBe('openai');
  });
});


// --- loadConfig ---

describe('loadConfig', () => {
  test('loads default config when no user override exists', () => {
    const manager = freshManager();
    fs.readFileSync.mockReturnValue(JSON.stringify(defaultConfig));
    fs.existsSync.mockReturnValue(false);

    const config = manager.loadConfig();
    expect(config.providers.openai.enabled).toBe(true);
    expect(config.preferences.defaultProvider).toBe('openai');
  });

  test('merges user override onto default config', () => {
    const manager = freshManager();
    const userOverride = {
      providers: { openai: { enabled: false } },
      preferences: { defaultProvider: 'anthropic' }
    };

    fs.readFileSync
      .mockReturnValueOnce(JSON.stringify(defaultConfig))
      .mockReturnValueOnce(JSON.stringify(userOverride));
    fs.existsSync.mockReturnValue(true);

    const config = manager.loadConfig();
    expect(config.providers.openai.enabled).toBe(false);
    expect(config.preferences.defaultProvider).toBe('anthropic');
  });

  test('returns fallback config when default file read fails', () => {
    const manager = freshManager();
    fs.readFileSync.mockImplementation(() => {
      throw new Error('ENOENT: no such file');
    });

    const config = manager.loadConfig();
    // Should be the fallback
    expect(config.providers.openai).toBeDefined();
    expect(config.providers.openai.models[0].id).toBe('gpt-4o');
  });

  test('returns fallback config when default file has invalid JSON', () => {
    const manager = freshManager();
    fs.readFileSync.mockReturnValue('not valid json {{{');
    fs.existsSync.mockReturnValue(false);

    const config = manager.loadConfig();
    expect(config.providers.openai).toBeDefined();
    expect(config.providers.openai.models[0].id).toBe('gpt-4o');
  });
});

// --- getAvailableModels ---

describe('getAvailableModels', () => {
  function loadedManager() {
    const manager = freshManager();
    fs.readFileSync.mockReturnValue(JSON.stringify(defaultConfig));
    fs.existsSync.mockReturnValue(false);
    manager.loadConfig();
    return manager;
  }

  test('returns models only from enabled providers', () => {
    const manager = loadedManager();
    const models = manager.getAvailableModels();
    // openai is enabled (2 models), anthropic is disabled
    expect(models.length).toBe(2);
    expect(models.every(m => m.provider === 'openai')).toBe(true);
  });

  test('each model has provider, providerName, and fullId', () => {
    const manager = loadedManager();
    const models = manager.getAvailableModels();
    models.forEach(m => {
      expect(m.provider).toBe('openai');
      expect(m.providerName).toBe('OpenAI');
      expect(m.fullId).toMatch(/^openai:/);
    });
  });

  test('auto-loads config if not loaded yet', () => {
    const manager = freshManager();
    fs.readFileSync.mockReturnValue(JSON.stringify(defaultConfig));
    fs.existsSync.mockReturnValue(false);
    // Don't call loadConfig manually
    const models = manager.getAvailableModels();
    expect(models.length).toBeGreaterThan(0);
  });
});

// --- getProviderModels ---

describe('getProviderModels', () => {
  function loadedManager() {
    const manager = freshManager();
    fs.readFileSync.mockReturnValue(JSON.stringify(defaultConfig));
    fs.existsSync.mockReturnValue(false);
    manager.loadConfig();
    return manager;
  }

  test('returns models for an enabled provider', () => {
    const manager = loadedManager();
    const models = manager.getProviderModels('openai');
    expect(models.length).toBe(2);
    expect(models[0].fullId).toBe('openai:gpt-4o');
  });

  test('returns empty array for a disabled provider', () => {
    const manager = loadedManager();
    const models = manager.getProviderModels('anthropic');
    expect(models).toEqual([]);
  });

  test('returns empty array for a non-existent provider', () => {
    const manager = loadedManager();
    const models = manager.getProviderModels('nonexistent');
    expect(models).toEqual([]);
  });
});

// --- getDefaultModel ---

describe('getDefaultModel', () => {
  function loadedManager() {
    const manager = freshManager();
    fs.readFileSync.mockReturnValue(JSON.stringify(defaultConfig));
    fs.existsSync.mockReturnValue(false);
    manager.loadConfig();
    return manager;
  }

  test('returns default model for the default provider when no providerId given', () => {
    const manager = loadedManager();
    const model = manager.getDefaultModel();
    expect(model).not.toBeNull();
    expect(model.id).toBe('gpt-4o');
    expect(model.fullId).toBe('openai:gpt-4o');
  });

  test('returns default model for a specific provider', () => {
    const manager = loadedManager();
    // Enable anthropic for this test
    manager.config.providers.anthropic.enabled = true;
    const model = manager.getDefaultModel('anthropic');
    expect(model).not.toBeNull();
    expect(model.id).toBe('claude-3-sonnet');
  });

  test('returns null for a disabled provider', () => {
    const manager = loadedManager();
    const model = manager.getDefaultModel('anthropic');
    expect(model).toBeNull();
  });

  test('returns null for a non-existent provider', () => {
    const manager = loadedManager();
    const model = manager.getDefaultModel('nonexistent');
    expect(model).toBeNull();
  });
});

// --- getEnabledProviders ---

describe('getEnabledProviders', () => {
  test('returns only enabled providers with id, name, modelCount', () => {
    const manager = freshManager();
    fs.readFileSync.mockReturnValue(JSON.stringify(defaultConfig));
    fs.existsSync.mockReturnValue(false);
    manager.loadConfig();

    const providers = manager.getEnabledProviders();
    expect(providers.length).toBe(1);
    expect(providers[0]).toEqual({
      id: 'openai',
      name: 'OpenAI',
      modelCount: 2
    });
  });
});

// --- Mutation methods ---

describe('setProviderEnabled', () => {
  function loadedManager() {
    const manager = freshManager();
    fs.readFileSync.mockReturnValue(JSON.stringify(defaultConfig));
    fs.existsSync.mockReturnValue(false);
    fs.writeFileSync.mockImplementation(() => {});
    manager.loadConfig();
    return manager;
  }

  test('enables a disabled provider', () => {
    const manager = loadedManager();
    manager.setProviderEnabled('anthropic', true);
    expect(manager.config.providers.anthropic.enabled).toBe(true);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  test('disables an enabled provider', () => {
    const manager = loadedManager();
    manager.setProviderEnabled('openai', false);
    expect(manager.config.providers.openai.enabled).toBe(false);
  });

  test('does nothing for non-existent provider', () => {
    const manager = loadedManager();
    manager.setProviderEnabled('nonexistent', true);
    // Should not throw, writeFileSync not called for this
    expect(manager.config.providers.nonexistent).toBeUndefined();
  });
});

describe('addModel', () => {
  function loadedManager() {
    const manager = freshManager();
    fs.readFileSync.mockReturnValue(JSON.stringify(defaultConfig));
    fs.existsSync.mockReturnValue(false);
    fs.writeFileSync.mockImplementation(() => {});
    manager.loadConfig();
    return manager;
  }

  test('adds a model to an existing provider', () => {
    const manager = loadedManager();
    const newModel = { id: 'gpt-5', name: 'GPT-5', description: 'Next gen' };
    manager.addModel('openai', newModel);
    const models = manager.config.providers.openai.models;
    expect(models.find(m => m.id === 'gpt-5')).toBeDefined();
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  test('throws for non-existent provider', () => {
    const manager = loadedManager();
    expect(() => {
      manager.addModel('nonexistent', { id: 'x', name: 'X' });
    }).toThrow('Provider nonexistent not found');
  });
});

describe('removeModel', () => {
  function loadedManager() {
    const manager = freshManager();
    fs.readFileSync.mockReturnValue(JSON.stringify(defaultConfig));
    fs.existsSync.mockReturnValue(false);
    fs.writeFileSync.mockImplementation(() => {});
    manager.loadConfig();
    return manager;
  }

  test('removes a model by id', () => {
    const manager = loadedManager();
    manager.removeModel('openai', 'gpt-4o-mini');
    const models = manager.config.providers.openai.models;
    expect(models.find(m => m.id === 'gpt-4o-mini')).toBeUndefined();
    expect(models.length).toBe(1);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  test('does nothing for non-existent model id', () => {
    const manager = loadedManager();
    const before = manager.config.providers.openai.models.length;
    manager.removeModel('openai', 'nonexistent-model');
    expect(manager.config.providers.openai.models.length).toBe(before);
  });

  test('does nothing for non-existent provider', () => {
    const manager = loadedManager();
    // Should not throw
    manager.removeModel('nonexistent', 'gpt-4o');
  });
});

// --- saveUserConfig ---

describe('saveUserConfig', () => {
  test('writes config as formatted JSON', () => {
    const manager = freshManager();
    fs.readFileSync.mockReturnValue(JSON.stringify(defaultConfig));
    fs.existsSync.mockReturnValue(false);
    fs.writeFileSync.mockImplementation(() => {});
    manager.loadConfig();

    manager.saveUserConfig();

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'utf8'
    );
    // Verify it's valid JSON with 2-space indent
    const written = fs.writeFileSync.mock.calls[0][1];
    expect(() => JSON.parse(written)).not.toThrow();
    expect(written).toContain('  '); // indented
  });

  test('handles write failure gracefully (no throw)', () => {
    const manager = freshManager();
    fs.readFileSync.mockReturnValue(JSON.stringify(defaultConfig));
    fs.existsSync.mockReturnValue(false);
    fs.writeFileSync.mockImplementation(() => {
      throw new Error('EACCES: permission denied');
    });
    manager.loadConfig();

    // Should not throw
    expect(() => manager.saveUserConfig()).not.toThrow();
  });
});
