class AssistantPanel {
  constructor() {
    this.currentContext = null;
    this.isProcessing = false;
    this.settings = {};
    this.availableWindows = [];
    this.selectedWindowIndex = null;

    // Simple initialization - no complex waiting
    this.initializeElements();
    this.bindEvents();
    this.loadAvailableModels();
    this.loadSettings();
    this.updateTheme();
    this.checkMailContext();

    this.nativeModulesAvailable = false;
    this.checkNativeModules();

    // Remove loading overlay and show content
    this.hideLoadingOverlay();
  }

  async checkNativeModules() {
    try {
      if (window.nativeModulesAPI) {
        const status = await window.nativeModulesAPI.getStatus();
        this.nativeModulesAvailable = status.available;
        
        if (this.nativeModulesAvailable) {
          this.setupNativeModuleListeners();
          console.log('✅ Native modules available');
        } else {
          console.log('ℹ️ Native modules not available - using fallbacks');
        }
      }
    } catch (error) {
      console.log('ℹ️ Native modules check failed:', error);
    }
  }

  setupNativeModuleListeners() {
    // Listen for text selection events
    window.nativeModulesAPI?.onTextSelected((data) => {
      console.log('Text selected:', data);
      // Handle selected text
    });

    // Listen for context menu actions
    window.nativeModulesAPI?.onContextMenuAction((data) => {
      console.log('Context menu action:', data);
      this.handleQuickAction(data.action, data.text);
    });

    // Listen for quick actions (from keyboard shortcuts)
    window.nativeModulesAPI?.onQuickAction((data) => {
      console.log('Quick action:', data);
      this.handleQuickAction(data.action, data.text);
    });
  }

  async handleQuickAction(action, text) {
    // Pre-fill the action
    if (this.userInput) {
      const prompts = {
        summarize: 'Summarize this text:',
        translate: 'Translate this text:',
        improve: 'Improve this text:',
        reply: 'Draft a reply to this:'
      };
      
      this.userInput.value = prompts[action] || action;
    }
    
    // Process with the text
    await this.processWithText(text);
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
    this.hideBtn = document.getElementById('hide-btn');     // NEW: Hide button
    this.quitBtn = document.getElementById('quit-btn');     // NEW: Quit button
    this.settingsBtn = document.getElementById('settings-btn');

    // Context elements
    this.contextIndicator = document.getElementById('context-indicator');
    this.contextDetails = document.querySelector('.context-details');
    this.refreshSelectionBtn = document.getElementById('refresh-selection-btn');

    // Window selector elements
    this.windowSelector = document.getElementById('window-selector');
    this.windowDropdown = document.getElementById('window-dropdown');
    this.refreshWindowsBtn = document.getElementById('refresh-windows-btn');

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

    // Prompt configuration elements
    this.promptSystemInput = document.getElementById('prompt-system');
    this.promptComposeInput = document.getElementById('prompt-compose');
    this.promptMailboxInput = document.getElementById('prompt-mailbox');
    this.promptSummarizeInput = document.getElementById('prompt-summarize');
    this.promptTranslateInput = document.getElementById('prompt-translate');
    this.promptImproveInput = document.getElementById('prompt-improve');
    this.promptReplyInput = document.getElementById('prompt-reply');

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
    if (this.hideBtn) {
      this.hideBtn.addEventListener('click', () => this.hidePanel());
    }
    if (this.quitBtn) {
      this.quitBtn.addEventListener('click', () => this.quitApp());
    }

    // Mail context refresh button
    if (this.refreshSelectionBtn) {
      this.refreshSelectionBtn.addEventListener('click', () => this.refreshMailSelection());
    }

    // Window selector controls
    if (this.refreshWindowsBtn) {
      this.refreshWindowsBtn.addEventListener('click', () => this.refreshMailWindows());
    }
    if (this.windowDropdown) {
      this.windowDropdown.addEventListener('change', () => this.applySelectedWindow());
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

    // Listen for window shown event to reset state
    if (window.electronAPI && window.electronAPI.onWindowShown) {
      window.electronAPI.onWindowShown(() => {
        this.resetOnShow();
      });
    }
  }

  // Add the quitApp method:
  async quitApp() {
    try {
      if (window.electronAPI) {
        await window.electronAPI.quitApp();
      }
    } catch (error) {
      console.error('Failed to quit app:', error);
      // Show error to user
      alert('Failed to quit application. Please use Activity Monitor to force quit.');
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

      // Load custom prompts
      this.settings.promptSystem = await window.electronAPI.getConfig('prompt-system') ?? 'You are a helpful AI assistant for email and text processing.';
      this.settings.promptCompose = await window.electronAPI.getConfig('prompt-compose') ?? 'The user is composing an email. Provide concise, professional assistance.';
      this.settings.promptMailbox = await window.electronAPI.getConfig('prompt-mailbox') ?? 'The user is working with email threads. Help them understand and respond to conversations.';
      this.settings.promptSummarize = await window.electronAPI.getConfig('prompt-summarize') ?? 'Please summarize this text concisely, highlighting the key points:';
      this.settings.promptTranslate = await window.electronAPI.getConfig('prompt-translate') ?? 'Please translate this text to English (or if it\'s already in English, ask me which language to translate to):';
      this.settings.promptImprove = await window.electronAPI.getConfig('prompt-improve') ?? 'Please improve this text for clarity, tone, and professionalism:';
      this.settings.promptReply = await window.electronAPI.getConfig('prompt-reply') ?? 'Help me draft a professional email reply to this:';

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

    // Update prompt inputs
    if (this.promptSystemInput) this.promptSystemInput.value = this.settings.promptSystem || '';
    if (this.promptComposeInput) this.promptComposeInput.value = this.settings.promptCompose || '';
    if (this.promptMailboxInput) this.promptMailboxInput.value = this.settings.promptMailbox || '';
    if (this.promptSummarizeInput) this.promptSummarizeInput.value = this.settings.promptSummarize || '';
    if (this.promptTranslateInput) this.promptTranslateInput.value = this.settings.promptTranslate || '';
    if (this.promptImproveInput) this.promptImproveInput.value = this.settings.promptImprove || '';
    if (this.promptReplyInput) this.promptReplyInput.value = this.settings.promptReply || '';
  }

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
        // Simply get the current Mail selection (no window enumeration needed)
        await this.loadCurrentSelection();
        // Always hide window selector since we're not using it anymore
        this.hideWindowSelector();
      }
    } catch (error) {
      console.log('No mail context available:', error);
      this.hideMailContext();
      this.hideWindowSelector();
    }
  }

  async loadCurrentSelection() {
    try {
      if (!window.electronAPI) return;

      // Get current selection - no parameters needed
      const context = await window.electronAPI.getMailWindowContext();
      console.log('📧 Current selection loaded:', JSON.stringify(context, null, 2));
      this.updateMailContext(context);
    } catch (error) {
      console.error('Failed to load current selection:', error);
      this.hideMailContext();
    }
  }

  updateMailContext(context) {
    console.log('📧 Updating mail context:', context);
    if (!context || !context.type || context.type === 'error') {
      console.log('⚠️ No valid context type, hiding mail context');
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
    } else if (context.type === 'viewer') {
      if (this.contextDetails) {
        const subject = context.subject ? `: ${context.subject.substring(0, 40)}...` : '';
        this.contextDetails.textContent = `Selected email${subject}`;
      }
    } else if (context.type === 'mailbox') {
      if (this.contextDetails) {
        this.contextDetails.textContent = 'No email selected';
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

  showWindowSelector(windows) {
    if (!this.windowSelector || !this.windowDropdown) return;

    // Clear existing options
    this.windowDropdown.innerHTML = '';

    // Create option for each window
    windows.forEach((win, index) => {
      const option = document.createElement('option');
      option.value = win.windowIndex;

      // Format: "[Type] Preview/Title"
      const icon = this.getWindowIcon(win.windowType);
      const label = win.preview || win.title || 'Untitled';
      option.textContent = `${icon} ${win.windowType} - ${label}`;

      if (index === 0) {
        option.selected = true;
      }

      this.windowDropdown.appendChild(option);
    });

    // Show the selector
    this.windowSelector.classList.remove('hidden');
  }

  hideWindowSelector() {
    if (this.windowSelector) {
      this.windowSelector.classList.add('hidden');
    }
  }

  getWindowIcon(windowType) {
    const icons = {
      'Composer': '✉️',
      'compose': '✉️',
      'Viewer': '📖',
      'viewer': '📖',
      'MAIN': '📬',
      'mailbox': '📬',
      'unknown': '📧'
    };
    return icons[windowType] || icons.unknown;
  }

  async refreshMailWindows() {
    console.log('Refreshing Mail selection...');
    await this.loadCurrentSelection();
  }

  async refreshMailSelection() {
    console.log('🔄 Refreshing Mail selection...');
    await this.loadCurrentSelection();
  }

  updateQuickActions(context) {
    // Enable/disable quick actions based on context
    this.actionButtons.forEach(btn => {
      const action = btn.dataset.action;
      let enabled = true;

      // Enable reply button for both mailbox and viewer contexts
      // Use case-insensitive comparison to handle variations (viewer/Viewer, mailbox/MAIN, etc.)
      if (action === 'reply') {
        const contextType = (context.type || '').toLowerCase();
        if (contextType !== 'mailbox' && contextType !== 'viewer') {
          enabled = false;
        }
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
      console.log('🎯 handleQuickAction - currentContext:', this.currentContext);

      if (this.currentContext && (this.currentContext.type === 'compose' || this.currentContext.type === 'viewer')) {
        console.log('✅ Using mail context content');
        textToProcess = this.currentContext.content || '';
      } else {
        console.log('⚠️ No mail context, using selected text or clipboard');
        if (window.systemAPI) {
          textToProcess = await window.systemAPI.getSelectedText() ||
                        await window.systemAPI.readClipboard() || '';
        }
      }

      console.log('📝 Text to process length:', textToProcess.length);

      // Generate appropriate prompt based on action using configurable prompts
      switch (action) {
        case 'summarize':
          if (this.currentContext && this.currentContext.type === 'viewer') {
            prompt = `Please summarize this email from ${this.currentContext.sender || 'sender'}:`;
          } else {
            prompt = this.settings.promptSummarize || 'Please summarize this text concisely, highlighting the key points:';
          }
          break;
        case 'translate':
          prompt = this.settings.promptTranslate || 'Please translate this text to English (or if it\'s already in English, ask me which language to translate to):';
          break;
        case 'improve':
          prompt = this.settings.promptImprove || 'Please improve this text for clarity, tone, and professionalism:';
          break;
        case 'reply':
          if (this.currentContext && (this.currentContext.type === 'mailbox' || this.currentContext.type === 'viewer')) {
            prompt = 'Based on this email, help me draft a professional reply:';
            textToProcess = this.currentContext.content || this.formatEmailThread(this.currentContext.messages);
          } else {
            prompt = this.settings.promptReply || 'Help me draft a professional email reply to this:';
          }
          break;
      }
      
      if (!textToProcess.trim()) {
        this.showError('No text available to process. Please select some text or compose an email.');
        return;
      }
      
      // Store the text and set the prompt for user to edit
      this.storedText = textToProcess; // Store email content for later processing

      if (this.userInput) {
        this.userInput.value = prompt;
        this.userInput.focus(); // Focus the input for editing
      }

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
    
    // Get text to process - use stored text if available (from quick actions)
    let textToProcess = '';
    try {
      if (this.storedText) {
        // Use the stored text from quick action button (Summarize, Translate, etc.)
        textToProcess = this.storedText;
        console.log('📦 Using stored text from quick action');
      } else if (this.currentContext && this.currentContext.type === 'compose') {
        textToProcess = this.currentContext.content || '';
      } else if (this.currentContext && (this.currentContext.type === 'viewer' || this.currentContext.type === 'mailbox')) {
        textToProcess = this.currentContext.content || this.formatEmailThread(this.currentContext.messages);
      } else if (window.systemAPI) {
        textToProcess = await window.systemAPI.getSelectedText() ||
                      await window.systemAPI.readClipboard() || '';
      }
    } catch (error) {
      console.log('Could not get text context:', error);
    }

    await this.processWithText(textToProcess, prompt);

    // Clear stored text after processing
    this.storedText = null;
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
    // ADD THIS LINE - shrink input when showing results
    document.querySelector('.input-section')?.classList.add('results-visible');    
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

    // ADD THIS LINE - expand input when hiding results
    document.querySelector('.input-section')?.classList.remove('results-visible');

    this.hidePrivacyWarning();
    if (this.privacyStatus) {
      this.privacyStatus.textContent = '🔒 Safe';
      this.privacyStatus.className = 'privacy-safe';
    }
  }

  resetOnShow() {
    // Clear all UI state
    this.clearAll();

    // Clear mail context
    this.hideMailContext();

    // Refresh mail context for current state
    this.checkMailContext();

    // Clear any stored text
    this.storedText = null;

    // Clear results content
    if (this.resultsContent) {
      this.resultsContent.innerHTML = '';
    }

    console.log('Assistant state reset on window show');
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

      // Save custom prompts
      if (this.promptSystemInput) {
        await window.electronAPI.setConfig('prompt-system', this.promptSystemInput.value.trim());
      }
      if (this.promptComposeInput) {
        await window.electronAPI.setConfig('prompt-compose', this.promptComposeInput.value.trim());
      }
      if (this.promptMailboxInput) {
        await window.electronAPI.setConfig('prompt-mailbox', this.promptMailboxInput.value.trim());
      }
      if (this.promptSummarizeInput) {
        await window.electronAPI.setConfig('prompt-summarize', this.promptSummarizeInput.value.trim());
      }
      if (this.promptTranslateInput) {
        await window.electronAPI.setConfig('prompt-translate', this.promptTranslateInput.value.trim());
      }
      if (this.promptImproveInput) {
        await window.electronAPI.setConfig('prompt-improve', this.promptImproveInput.value.trim());
      }
      if (this.promptReplyInput) {
        await window.electronAPI.setConfig('prompt-reply', this.promptReplyInput.value.trim());
      }

      // Update local settings
      this.settings = {
        filterApiKeys: filterApiKeysEl?.checked ?? true,
        filterCredentials: filterCredentialsEl?.checked ?? true,
        filterFinancial: filterFinancialEl?.checked ?? true,
        model: modelSelectEl?.value ?? 'gpt-4',
        promptSystem: this.promptSystemInput?.value.trim() || 'You are a helpful AI assistant for email and text processing.',
        promptCompose: this.promptComposeInput?.value.trim() || 'The user is composing an email. Provide concise, professional assistance.',
        promptMailbox: this.promptMailboxInput?.value.trim() || 'The user is working with email threads. Help them understand and respond to conversations.',
        promptSummarize: this.promptSummarizeInput?.value.trim() || 'Please summarize this text concisely, highlighting the key points:',
        promptTranslate: this.promptTranslateInput?.value.trim() || 'Please translate this text to English (or if it\'s already in English, ask me which language to translate to):',
        promptImprove: this.promptImproveInput?.value.trim() || 'Please improve this text for clarity, tone, and professionalism:',
        promptReply: this.promptReplyInput?.value.trim() || 'Help me draft a professional email reply to this:'
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