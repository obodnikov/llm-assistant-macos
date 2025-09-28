# 🔒 Privacy & Security Guide

## Privacy-First Design

LLM Assistant is built with privacy as a core principle. We believe AI assistance should be powerful while keeping your sensitive information secure.

### Core Privacy Principles
1. **Local-First**: Sensitive data filtering happens on your device
2. **Minimal Data**: Only necessary text is sent to AI providers
3. **User Control**: You decide what gets filtered and what gets processed
4. **Transparency**: Clear visibility into what data is being protected
5. **No Tracking**: We don't collect analytics or usage data

## Sensitive Content Protection

### Automatic Detection

The app automatically detects and filters these types of sensitive content:

#### 🔑 API Keys & Tokens
**Patterns Detected**:
```
sk-...                    # OpenAI keys
pk_...                    # Stripe public keys
AIza...                   # Google API keys
ya29....                  # Google OAuth tokens
glpat-...                 # GitLab tokens
ghp_...                   # GitHub tokens
xoxb-..., xoxp-...       # Slack tokens
```

**Example**:
```
Input:  "My API key is sk-abc123def456ghi789"
Output: "My API key is [API_KEY_FILTERED]"
```

#### 🔐 Credentials & Passwords
**Patterns Detected**:
```
password: ...
login: ...
username: ...
passwd: ...
pwd: ...
```

**Example**:
```
Input:  "The password is: secret123"
Output: "The password is: [CREDENTIAL_FILTERED]"
```

#### 💳 Financial Information
**Patterns Detected**:
```
4123 4567 8901 2345      # Credit card numbers
123-45-6789              # Social Security Numbers
routing: 123456789       # Bank routing numbers
account: 9876543210      # Account numbers
IBAN: GB82...            # International bank codes
```

**Example**:
```
Input:  "My card number is 4123 4567 8901 2345"
Output: "My card number is [FINANCIAL_FILTERED]"
```

#### 📧 Personal Identifiers (Optional)
**Patterns Detected**:
```
john@example.com         # Email addresses
(555) 123-4567          # Phone numbers
```

### Visual Feedback System

#### Real-Time Highlighting
When you type in the assistant, sensitive content is highlighted immediately:

```
🟡 Yellow highlight: Potentially sensitive (will be filtered)
🔴 Red highlight: Definitely sensitive (blocked)
🟢 Green indicator: Content is safe to process
```

#### Privacy Status Indicator
```
🔒 Safe - No sensitive content detected
⚠️  Filtered - X items will be removed before processing
🚫 Blocked - Too much sensitive content (manual review required)
```

#### Detailed Filtering Report
```
┌─────────────────────────────────────────────┐
│ Privacy Filtering Report                    │
├─────────────────────────────────────────────┤
│ ⚠️  2 API keys filtered                     │
│ ⚠️  1 credential filtered                   │
│ ⚠️  1 phone number filtered                 │
│                                             │
│ Filtered content:                           │
│ • sk-abc... → [API_KEY_FILTERED]           │
│ • password123 → [CREDENTIAL_FILTERED]      │
│ • (555) 123-4567 → [PHONE_FILTERED]       │
│                                             │
│ [ Show Details ] [ Send Anyway ] [ Edit ]  │
└─────────────────────────────────────────────┘
```

## Configuration Options

### Privacy Settings Panel

Access through: Assistant → Settings → Privacy Settings

#### Basic Settings
```
☑ Filter API keys and tokens
☑ Filter login credentials  
☑ Filter financial information
☐ Filter email addresses
☐ Filter phone numbers
```

#### Advanced Settings
```
Sensitivity Level:
○ Strict    - Block most potentially sensitive content
● Balanced  - Filter obvious sensitive content (default)
○ Permissive - Only filter high-confidence sensitive content

Custom Patterns:
[Add your own regex patterns for company-specific data]
```

### Custom Pattern Configuration

#### Adding Company-Specific Patterns
```json
{
  "custom-patterns": [
    {
      "name": "employee-ids",
      "pattern": "EMP-\\d{6}",
      "description": "Employee ID numbers",
      "action": "filter"
    },
    {
      "name": "project-codes",
      "pattern": "PROJ-[A-Z]{3}-\\d{4}",
      "description": "Internal project codes", 
      "action": "highlight"
    },
    {
      "name": "server-names",
      "pattern": "srv-[a-z]{3}-\\d{2}",
      "description": "Server hostnames",
      "action": "block"
    }
  ]
}
```

#### Pattern Actions
- **filter**: Replace with `[CUSTOM_FILTERED]`
- **highlight**: Show warning but allow processing
- **block**: Prevent processing entirely

## Data Flow & Privacy

### What Happens to Your Data

#### 1. Input Stage
```
Your Text Input
       ↓
Local Privacy Filtering (on your Mac)
       ↓
Filtered/Safe Text
```

#### 2. Processing Stage
```
Filtered Text → OpenAI API → AI Response
       ↓              ↓            ↓
   (via HTTPS)   (processed    (returned
                  remotely)     to you)
```

#### 3. Storage & Memory
```
API Response → Displayed to You → Optional: Copied to Clipboard
       ↓              ↓                        ↓
   (temporary     (visible       (your choice to use)
    memory)       on screen)
```

### What We Never Send
- ❌ **Filtered sensitive content** (replaced with placeholders)
- ❌ **Full email addresses** (if filtering enabled)
- ❌ **Complete financial data** (card numbers, SSNs, etc.)
- ❌ **API keys or credentials** (yours or others')
- ❌ **File paths or system info** (unless explicitly included)

### What We Do Send
- ✅ **Filtered text content** (with sensitive parts removed)
- ✅ **Context about task** ("improve this email", "summarize this")
- ✅ **General email context** (that it's an email, not specific details)

## Privacy by Feature

### Email Integration Privacy

#### Mail.app Data Access
```
What we read:
✅ Email subject lines (for context)
✅ Email body content (filtered)
✅ Recipient count (not addresses, if filtering enabled)

What we don't read:
❌ Email addresses (if privacy filtering on)
❌ Attachment content
❌ Email metadata (timestamps, headers, etc.)
❌ Other mailboxes or accounts
```

#### Context Processing
```
Original Email Thread:
From: boss@company.com
To: you@company.com
Subject: Q4 Budget Review
Content: "Please review the attached budget with our client passwords..."

Filtered for AI:
Subject: Q4 Budget Review  
Content: "Please review the attached budget with our client [CREDENTIAL_FILTERED]..."
Context: "This is an email thread with 1 message"
```

### Quick Actions Privacy

#### Summarize
- **Sends**: Email content (filtered)
- **Doesn't Send**: Recipient details, timestamps, attachments

#### Translate  
- **Sends**: Text to translate (filtered)
- **Doesn't Send**: Context about where text came from

#### Improve
- **Sends**: Text to improve (filtered)
- **Doesn't Send**: Information about intended recipients

#### Draft Reply
- **Sends**: Thread summary (filtered), context that it's a reply
- **Doesn't Send**: Original email addresses, specific names

## Local vs Cloud Processing

### Current Architecture (Cloud-Based)
```
Your Mac                    OpenAI Servers
┌─────────────────┐        ┌─────────────────┐
│ Privacy Filter  │───────▶│ AI Processing   │
│ (Local)         │        │ (Cloud)         │
└─────────────────┘        └─────────────────┘
```

**Pros**: High quality AI, fast responses, no local hardware requirements
**Cons**: Data leaves your device (albeit filtered)

### Future: Local AI Option
```
Your Mac
┌─────────────────┐
│ Privacy Filter  │
│ (Local)         │
│       +         │
│ Local AI Model  │
│ (Ollama/Llama)  │
└─────────────────┘
```

**Pros**: Complete privacy, no internet required, no usage costs
**Cons**: Requires powerful hardware, slower responses, lower quality

## Privacy Compliance

### Data Retention

#### What OpenAI Stores
According to [OpenAI's Data Usage Policy](https://openai.com/enterprise-privacy):
- **API calls**: Stored for 30 days for abuse monitoring
- **Training**: Your data is NOT used for training by default
- **Deletion**: You can request data deletion

#### What We Store Locally
- **Settings**: API keys (encrypted), privacy preferences
- **No conversation history**: Previous chats are not saved
- **No analytics**: We don't track usage patterns

### GDPR & Privacy Rights

#### Your Rights
- **Right to Know**: This document explains our data practices
- **Right to Control**: You configure all privacy settings
- **Right to Delete**: Remove config file to delete all local data
- **Right to Portability**: Export settings from config file

#### Compliance Features
- **Consent**: Setup wizard requires explicit privacy choices
- **Transparency**: Clear labeling of what data is processed
- **Control**: Granular privacy settings
- **Minimization**: Only necessary data is processed

## Security Best Practices

### For Individual Users

#### ✅ Recommended Settings
```
Privacy Level: Balanced or Strict
Filter API Keys: ✅ Enabled
Filter Credentials: ✅ Enabled  
Filter Financial: ✅ Enabled
Custom Patterns: Configure for your industry
Review Before Send: ✅ Always check filtered content
```

#### ✅ Safe Usage Patterns
- **Review filtering results** before processing
- **Use for general content** (emails, documents, text)
- **Avoid highly sensitive documents** (legal, medical, financial)
- **Test with sample data** first
- **Monitor OpenAI usage** for unexpected activity

### For Organizations

#### 🏢 Enterprise Considerations
- **Policy Compliance**: Ensure alignment with company data policies
- **Training**: Educate users on privacy features
- **Monitoring**: Regular review of usage patterns
- **Custom Patterns**: Configure industry-specific filtering
- **Access Control**: Limit who can modify privacy settings

#### 🏢 Industry-Specific Settings

**Financial Services**:
```json
{
  "strict-mode": true,
  "block-financial": true,
  "custom-patterns": ["account-numbers", "routing-codes", "cusip-ids"],
  "require-approval": true
}
```

**Healthcare**:
```json
{
  "hipaa-compliant": true,
  "block-personal-health": true,
  "custom-patterns": ["patient-ids", "medical-record-numbers", "insurance-ids"],
  "local-processing-required": true
}
```

**Legal**:
```json
{
  "attorney-client-privilege": true,
  "block-case-numbers": true,
  "custom-patterns": ["docket-numbers", "client-codes", "matter-ids"],
  "encryption-required": true
}
```

## Privacy Troubleshooting

### Common Privacy Issues

#### "Too Much Content Filtered"
**Problem**: Assistant says most text was filtered
**Solutions**:
1. **Adjust sensitivity**: Settings → Privacy → Set to "Permissive"
2. **Review patterns**: Check if custom patterns are too broad
3. **Edit text**: Remove sensitive parts manually
4. **Use local processing**: For highly sensitive content

#### "False Positives"
**Problem**: Normal text being flagged as sensitive
**Solutions**:
1. **Check patterns**: Review what triggered the filter
2. **Whitelist terms**: Add exceptions for false positives
3. **Custom configuration**: Tune patterns for your use case
4. **Manual override**: Use "Send Anyway" option

#### "Sensitive Content Not Detected"
**Problem**: Obviously sensitive content passes through
**Solutions**:
1. **Increase sensitivity**: Use "Strict" mode
2. **Add custom patterns**: Configure for your specific needs
3. **Manual review**: Always check content before processing
4. **Report issue**: Help improve detection algorithms

### Privacy Testing

#### Test Your Configuration
```bash
# Test with sample sensitive content
echo "My API key is sk-test123 and password is secret456" | npm run test-privacy

# Expected output: 
# "My API key is [API_KEY_FILTERED] and password is [CREDENTIAL_FILTERED]"
```

#### Verify Filtering Works
1. **Type test content**: Include fake API keys, passwords
2. **Check highlighting**: Should show yellow/red highlights
3. **Process content**: Verify it gets filtered in results
4. **Review logs**: Check that sensitive content isn't logged

## Privacy Audit Checklist

### Monthly Privacy Review
- [ ] **Review OpenAI usage**: Check for unexpected API calls
- [ ] **Audit filtered content**: Ensure filtering is working
- [ ] **Update patterns**: Add new sensitive data patterns
- [ ] **Check access logs**: Monitor who has used the app
- [ ] **Verify encryption**: Ensure config file is properly secured
- [ ] **Test filtering**: Try processing sensitive test content

### Privacy Incident Response
If you suspect sensitive data was accidentally processed:

#### Immediate Actions
1. **Stop using the app** immediately
2. **Check OpenAI usage logs** for the timeframe
3. **Document what happened** (what data, when, how)
4. **Contact OpenAI** to request data deletion if needed

#### Follow-up Actions
1. **Update privacy settings** to prevent recurrence
2. **Add custom patterns** for the type of data that leaked
3. **Train users** on proper usage if team environment
4. **Review and improve** processes

## Privacy-Enhanced Workflows

### For Maximum Privacy
```
1. Enable ALL privacy filters
2. Use "Strict" sensitivity mode
3. Add custom patterns for your data types
4. Always review filtered content before processing
5. Use local AI models when available (future)
6. Regular privacy audits and testing
```

### For Balanced Privacy
```
1. Enable core filters (API keys, credentials, financial)
2. Use "Balanced" sensitivity mode  
3. Spot-check filtered content periodically
4. Monitor usage for unexpected patterns
5. Configure industry-specific patterns
```

### For Development/Testing
```
1. Use test data only
2. Enable logging to see what gets filtered
3. Test edge cases with sample sensitive content
4. Verify filtering works before production use
5. Document privacy configuration decisions
```

## Future Privacy Enhancements

### Planned Features
- **🔄 Local AI Models**: Complete offline processing with Ollama
- **🔄 Advanced Encryption**: End-to-end encryption for all data
- **🔄 Zero-Knowledge Architecture**: We never see your unencrypted data
- **🔄 Auditing Tools**: Detailed logs of what was filtered and when
- **🔄 Team Management**: Enterprise privacy controls and policies

### Privacy Roadmap
- **Q1 2024**: Enhanced custom pattern editor
- **Q2 2024**: Local AI model integration (Ollama)
- **Q3 2024**: Advanced privacy auditing tools
- **Q4 2024**: Enterprise privacy management console

---

## Getting Help

### Privacy Questions
- **Email**: privacy@yourcompany.com
- **GitHub**: Tag issues with "privacy" label
- **Documentation**: This guide and [SETUP.md](SETUP.md)

### Reporting Privacy Issues
If you discover a privacy vulnerability:
1. **DO NOT** post publicly on GitHub
2. **Email** security@yourcompany.com with details
3. **Include** steps to reproduce the issue
4. **Expect** a response within 24 hours

---

**Your privacy is our priority. This assistant is designed to be powerful while keeping your sensitive information secure and under your control.**

**Next**: Read [DEVELOPMENT.md](DEVELOPMENT.md) for technical details about privacy implementation.