class AssistantPanel {
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
    
    // Remove loading overlay and show content
    this.hideLoadingOverlay();
  }

  hideLoadingOverlay() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
      setTimeout(() => {
        loadingOverlay.classList.add('hidden');
        document.body.classList.add('loaded');
      }, 100);
    } else {
      document.body.classList.add('loaded');
    }
  }

  initializeElements() {
    // Main elements
    this.userInput = document.getElementById('user-input');
    this.processBtn = document.getElementById('process-btn');
    this.clearBtn = document.getElementById('clear-btn');
    this.closeBtn = document.getElementById('close-btn');
    this.settingsBtn = document.getElementById('settings-btn');
    
    // Context elements
    this.contextIndicator = document.getElementById('context-indicator');
    this.contextDetails = document.querySelector('.context-details');
    
    // Privacy elements
    this.privacyStatus = document.getElementById('privacy-status');
    this.privacyWarning = document.getElementById('privacy-warning');
    this.filteredCount = document.getElementById('filtered-count');
    
    // Results elements
    this.processing = document.getElementById('processing');
    this.results = document.getElementById('results');
    this.resultsContent = document.getElementById('results-content');
    this.copyResultBtn = document.getElementById('copy-result');
    this.applyResultBtn = document.getElementById('apply-result');
    
    // Settings elements
    this.settingsPanel = document.getElementById('settings-panel');
    this.settingsClose = document.getElementById('settings-close');
    this.openaiKeyInput = document.getElementById('openai-key');
    this.saveSettingsBtn = document.getElementById('save-settings');
    
    // Quick action buttons
    this.actionButtons = document.querySelectorAll('.action-btn');
  }

  bindEvents() {
    // Main controls
    if (this.processBtn) {
      this.processBtn.addEventListener('click', () => this.processRequest());
    }
    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => this.clearAll());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.hidePanel());
    }
    
    // Settings
    if (this.settingsBtn) {
      this.settingsBtn.addEventListener('click', () => this.showSettings());
    }
    if (this.settingsClose) {
      this.settingsClose.addEventListener('click', () => this.hideSettings());
    }
    if (this.saveSettingsBtn) {
      this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
    }
    
    // Results actions
    if (this.copyResultBtn) {
      this.copyResultBtn.addEventListener('click', () => this.copyResult());
    }
    if (this.applyResultBtn) {
      this.applyResultBtn.addEventListener('click', () => this.applyResult());
    }
    
    // Quick actions
    this.actionButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleQuickAction(action);
      });
    });
    
    // Input events
    if (this.userInput) {
      this.userInput.addEventListener('input', () => this.handleInputChange());
      this.userInput.addEventListener('keydown', (e) => {
        if (e.metaKey && e.key === 'Enter') {
          this.processRequest();
        }
      });
    }
    
    // Privacy warning details
    const showFilteredBtn = document.getElementById('show-filtered');
    if (showFilteredBtn) {
      showFilteredBtn.addEventListener('click', () => this.showFilteredDetails());
    }
  }

  async loadSettings() {
    try {
      if (!window.electronAPI) {
        console.log('ElectronAPI not available yet');
        return;
      }

      // Load API key
      const apiKey = await window.electronAPI.getConfig('openai-api-key');
      if (apiKey && this.openaiKeyInput) {
        this.openaiKeyInput.value = apiKey;
      }
      
      // Load privacy settings
      this.settings.filterApiKeys = await window.electronAPI.getConfig('filter-api-keys') ?? true;
      this.settings.filterCredentials = await window.electronAPI.getConfig('filter-credentials') ?? true;
      this.settings.filterFinancial = await window.electronAPI.getConfig('filter-financial') ?? true;
      
      // Load model preference
      this.settings.model = await window.electronAPI.getConfig('ai-model') ?? 'gpt-4';
      
      this.updateSettingsUI();
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  updateSettingsUI() {
    // Update checkboxes
    const filterApiKeysCheckbox = document.getElementById('filter-api-keys');
    const filterCredentialsCheckbox = document.getElementById('filter-credentials');
    const filterFinancialCheckbox = document.getElementById('filter-financial');
    const modelSelect = document.getElementById('model-select');
    
    if (filterApiKeysCheckbox) filterApiKeysCheckbox.checked = this.settings.filterApiKeys;
    if (filterCredentialsCheckbox) filterCredentialsCheckbox.checked = this.settings.filterCredentials;
    if (filterFinancialCheckbox) filterFinancialCheckbox.checked = this.settings.filterFinancial;
    if (modelSelect) modelSelect.value = this.settings.model;
  }

  async updateTheme() {
    try {
      if (window.electronAPI) {
        const theme = await window.electronAPI.getSystemTheme();
        document.documentElement.setAttribute('data-theme', theme);
      }
    } catch (error) {
      console.error('Failed to get system theme:', error);
    }
  }

  async checkMailContext() {
    try {
      if (window.electronAPI) {
        const context = await window.electronAPI.getMailContext();
        this.updateMailContext(context);
      }
    } catch (error) {
      console.log('No mail context available:', error);
      this.hideMailContext();
    }
  }

  updateMailContext(context) {
    if (!context || !context.type) {
      this.hideMailContext();
      return;
    }

    this.currentContext = context;
    if (this.contextIndicator) {
      this.contextIndicator.classList.remove('hidden');
    }
    
    if (context.type === 'compose') {
      if (this.contextDetails) {
        this.contextDetails.textContent = 'Composing email';
      }
    } else if (context.type === 'mailbox') {
      const count = context.messages?.length || 0;
      if (this.contextDetails) {
        this.contextDetails.textContent = `${count} emails in current view`;
      }
    }
    
    this.updateQuickActions(context);
  }

  hideMailContext() {
    if (this.contextIndicator) {
      this.contextIndicator.classList.add('hidden');
    }
    this.currentContext = null;
  }

  updateQuickActions(context) {
    // Enable/disable quick actions based on context
    this.actionButtons.forEach(btn => {
      const action = btn.dataset.action;
      let enabled = true;
      
      if (action === 'reply' && context.type !== 'mailbox') {
        enabled = false;
      }
      
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? '1' : '0.5';
    });
  }

  async handleQuickAction(action) {
    if (this.isProcessing) return;
    
    let prompt = '';
    let textToProcess = '';
    
    try {
      // Get current text (clipboard or mail context)
      if (this.currentContext && this.currentContext.type === 'compose') {
        textToProcess = this.currentContext.content || '';
      } else {
        if (window.systemAPI) {
          textToProcess = await window.systemAPI.getSelectedText() || 
                        await window.systemAPI.readClipboard() || '';
        }
      }
      
      // Generate appropriate prompt based on action
      switch (action) {
        case 'summarize':
          prompt = 'Please summarize this text concisely, highlighting the key points:';
          break;
        case 'translate':
          prompt = 'Please translate this text to English (or if it\'s already in English, ask me which language to translate to):';
          break;
        case 'improve':
          prompt = 'Please improve this text for clarity, tone, and professionalism:';
          break;
        case 'reply':
          if (this.currentContext && this.currentContext.type === 'mailbox') {
            prompt = 'Based on this email conversation, help me draft a professional reply:';
            textToProcess = this.formatEmailThread(this.currentContext.messages);
          } else {
            prompt = 'Help me draft a professional email reply to this:';
          }
          break;
      }
      
      if (!textToProcess.trim()) {
        this.showError('No text available to process. Please select some text or compose an email.');
        return;
      }
      
      // Set the input and process
      if (this.userInput) {
        this.userInput.value = prompt;
      }
      await this.processWithText(textToProcess);
      
    } catch (error) {
      console.error('Quick action failed:', error);
      this.showError('Failed to perform quick action. Please try again.');
    }
  }

  formatEmailThread(messages) {
    if (!messages || messages.length === 0) return '';
    
    return messages.map((msg, index) => {
      return `Email ${index + 1}:
From: ${msg.sender}
Subject: ${msg.subject}
Content: ${msg.content}

---`;
    }).join('\n');
  }

  async handleInputChange() {
    if (!this.userInput) return;
    
    const text = this.userInput.value;
    
    if (!text.trim()) {
      this.hidePrivacyWarning();
      return;
    }
    
    try {
      if (window.electronAPI) {
        // Check for sensitive content
        const filterResult = await window.electronAPI.filterSensitiveContent(text);
        this.updatePrivacyStatus(filterResult);
      }
    } catch (error) {
      console.error('Privacy filtering failed:', error);
    }
  }

  updatePrivacyStatus(filterResult) {
    if (!this.privacyStatus) return;

    if (filterResult.safe) {
      this.privacyStatus.textContent = '🔒 Safe';
      this.privacyStatus.className = 'privacy-safe';
      this.hidePrivacyWarning();
    } else {
      this.privacyStatus.textContent = '⚠️ Filtered';
      this.privacyStatus.className = 'privacy-warning';
      this.showPrivacyWarning(filterResult.filteredCount || 1);
    }
  }

  showPrivacyWarning(count) {
    if (this.filteredCount) {
      this.filteredCount.textContent = count;
    }
    if (this.privacyWarning) {
      this.privacyWarning.classList.remove('hidden');
    }
  }

  hidePrivacyWarning() {
    if (this.privacyWarning) {
      this.privacyWarning.classList.add('hidden');
    }
  }

  async processRequest() {
    if (this.isProcessing || !this.userInput) return;
    
    const prompt = this.userInput.value.trim();
    if (!prompt) {
      this.showError('Please enter a description of what you need.');
      return;
    }
    
    // Get text to process
    let textToProcess = '';
    try {
      if (this.currentContext && this.currentContext.type === 'compose') {
        textToProcess = this.currentContext.content || '';
      } else if (this.currentContext && this.currentContext.type === 'mailbox') {
        textToProcess = this.formatEmailThread(this.currentContext.messages);
      } else if (window.systemAPI) {
        textToProcess = await window.systemAPI.getSelectedText() || 
                      await window.systemAPI.readClipboard() || '';
      }
    } catch (error) {
      console.log('Could not get text context:', error);
    }
    
    await this.processWithText(textToProcess, prompt);
  }

  async processWithText(textToProcess, customPrompt = null) {
    if (this.isProcessing) return;
    
    const prompt = customPrompt || (this.userInput ? this.userInput.value.trim() : '');
    
    this.startProcessing();
    
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Filter sensitive content before sending
      const filterResult = await window.electronAPI.filterSensitiveContent(textToProcess);
      
      if (!filterResult.safe && filterResult.blocked) {
        this.showError('Cannot process text containing sensitive information.');
        return;
      }
      
      const safeText = filterResult.safeText || textToProcess;
      
      // Process with AI
      const result = await window.electronAPI.processWithAI(safeText, prompt, this.currentContext);
      
      this.showResult(result);
      
    } catch (error) {
      console.error('Processing failed:', error);
      this.showError(error.message || 'Failed to process request. Please check your settings and try again.');
    } finally {
      this.stopProcessing();
    }
  }

  startProcessing() {
    this.isProcessing = true;
    if (this.processBtn) {
      this.processBtn.disabled = true;
    }
    if (this.processing) {
      this.processing.classList.remove('hidden');
    }
    if (this.results) {
      this.results.classList.add('hidden');
    }
  }

  stopProcessing() {
    this.isProcessing = false;
    if (this.processBtn) {
      this.processBtn.disabled = false;
    }
    if (this.processing) {
      this.processing.classList.add('hidden');
    }
  }

  showResult(result) {
    if (this.resultsContent) {
      this.resultsContent.textContent = result;
    }
    if (this.results) {
      this.results.classList.remove('hidden');
    }
  }

  showError(message) {
    if (this.resultsContent) {
      this.resultsContent.textContent = `Error: ${message}`;
    }
    if (this.results) {
      this.results.classList.remove('hidden');
    }
  }

  async copyResult() {
    try {
      if (!this.resultsContent || !window.systemAPI) return;
      
      const text = this.resultsContent.textContent;
      await window.systemAPI.writeClipboard(text);
      
      // Show brief feedback
      if (this.copyResultBtn) {
        const originalText = this.copyResultBtn.textContent;
        this.copyResultBtn.textContent = '✓';
        setTimeout(() => {
          this.copyResultBtn.textContent = originalText;
        }, 1000);
      }
      
    } catch (error) {
      console.error('Failed to copy result:', error);
    }
  }

  async applyResult() {
    // TODO: Implement applying result back to Mail.app or active application
    console.log('Apply result - to be implemented');
  }

  clearAll() {
    if (this.userInput) {
      this.userInput.value = '';
    }
    if (this.results) {
      this.results.classList.add('hidden');
    }
    this.hidePrivacyWarning();
    if (this.privacyStatus) {
      this.privacyStatus.textContent = '🔒 Safe';
      this.privacyStatus.className = 'privacy-safe';
    }
  }

  async hidePanel() {
    try {
      if (window.electronAPI) {
        await window.electronAPI.hideWindow();
      }
    } catch (error) {
      console.error('Failed to hide window:', error);
    }
  }

  showSettings() {
    if (this.settingsPanel) {
      this.settingsPanel.classList.remove('hidden');
    }
  }

  hideSettings() {
    if (this.settingsPanel) {
      this.settingsPanel.classList.add('hidden');
    }
  }

  async saveSettings() {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Save API key
      if (this.openaiKeyInput) {
        const apiKey = this.openaiKeyInput.value.trim();
        if (apiKey) {
          await window.electronAPI.setConfig('openai-api-key', apiKey);
        }
      }
      
      // Save privacy settings
      const filterApiKeysEl = document.getElementById('filter-api-keys');
      const filterCredentialsEl = document.getElementById('filter-credentials');
      const filterFinancialEl = document.getElementById('filter-financial');
      const modelSelectEl = document.getElementById('model-select');
      
      if (filterApiKeysEl) {
        await window.electronAPI.setConfig('filter-api-keys', filterApiKeysEl.checked);
      }
      if (filterCredentialsEl) {
        await window.electronAPI.setConfig('filter-credentials', filterCredentialsEl.checked);
      }
      if (filterFinancialEl) {
        await window.electronAPI.setConfig('filter-financial', filterFinancialEl.checked);
      }
      if (modelSelectEl) {
        await window.electronAPI.setConfig('ai-model', modelSelectEl.value);
      }
      
      // Update local settings
      this.settings = {
        filterApiKeys: filterApiKeysEl?.checked ?? true,
        filterCredentials: filterCredentialsEl?.checked ?? true,
        filterFinancial: filterFinancialEl?.checked ?? true,
        model: modelSelectEl?.value ?? 'gpt-4'
      };
      
      // Show success feedback
      if (this.saveSettingsBtn) {
        const originalText = this.saveSettingsBtn.textContent;
        this.saveSettingsBtn.textContent = 'Saved!';
        setTimeout(() => {
          this.saveSettingsBtn.textContent = originalText;
        }, 1500);
      }
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      if (this.saveSettingsBtn) {
        this.saveSettingsBtn.textContent = 'Error saving';
        setTimeout(() => {
          this.saveSettingsBtn.textContent = 'Save';
        }, 1500);
      }
    }
  }

  showFilteredDetails() {
    alert('Filtered content details - to be implemented');
  }
}

// Simple initialization - wait for DOM then create assistant
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, creating assistant...');
  window.assistant = new AssistantPanel();
});

// Handle theme changes
if (typeof window !== 'undefined' && window.electronAPI?.onThemeChanged) {
  window.electronAPI.onThemeChanged(() => {
    if (window.assistant) {
      window.assistant.updateTheme();
    }
  });
}