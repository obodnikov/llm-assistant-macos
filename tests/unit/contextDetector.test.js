/**
 * Unit tests for src/main/contextDetector.js
 * Pure functions — no mocking needed.
 * Spec: Docs/TEST_PLAN.md Section 1
 */

const {
  isMail,
  getContextIcon,
  getContextLabel,
  shouldShowDraftReply
} = require('../../src/main/contextDetector');

// --- isMail ---

describe('isMail', () => {
  test('returns true for "Mail"', () => {
    expect(isMail('Mail')).toBe(true);
  });

  test('returns false for "Safari"', () => {
    expect(isMail('Safari')).toBe(false);
  });

  test('returns false for lowercase "mail"', () => {
    expect(isMail('mail')).toBe(false);
  });

  test('returns false for null', () => {
    expect(isMail(null)).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(isMail(undefined)).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(isMail('')).toBe(false);
  });
});

// --- getContextIcon ---

describe('getContextIcon', () => {
  test('returns 📧 for mail source', () => {
    expect(getContextIcon({ source: 'mail' })).toBe('📧');
  });

  test('returns 📎 for clipboard source', () => {
    expect(getContextIcon({ source: 'clipboard' })).toBe('📎');
  });

  test('returns ✏️ for manual source', () => {
    expect(getContextIcon({ source: 'manual' })).toBe('✏️');
  });

  test('returns 📋 for app source', () => {
    expect(getContextIcon({ source: 'app' })).toBe('📋');
  });

  test('returns 📋 for unknown source', () => {
    expect(getContextIcon({ source: 'something-else' })).toBe('📋');
  });
});


// --- getContextLabel ---

describe('getContextLabel', () => {
  test('returns "Composing email" for mail compose', () => {
    expect(getContextLabel({ source: 'mail', type: 'compose' })).toBe('Composing email');
  });

  test('returns "Email: <subject>" for mail viewer with subject', () => {
    expect(getContextLabel({ source: 'mail', type: 'viewer', subject: 'Hello World' }))
      .toBe('Email: Hello World');
  });

  test('returns "Email: " for mail viewer with null subject', () => {
    expect(getContextLabel({ source: 'mail', type: 'viewer', subject: null }))
      .toBe('Email: ');
  });

  test('truncates subject to 40 chars for mail viewer', () => {
    const longSubject = 'A'.repeat(50);
    const label = getContextLabel({ source: 'mail', type: 'viewer', subject: longSubject });
    expect(label).toBe('Email: ' + 'A'.repeat(40));
  });

  test('returns "Mail" for mail mailbox type', () => {
    expect(getContextLabel({ source: 'mail', type: 'mailbox' })).toBe('Mail');
  });

  test('returns "Clipboard" for clipboard source', () => {
    expect(getContextLabel({ source: 'clipboard' })).toBe('Clipboard');
  });

  test('returns "Manual input" for manual source', () => {
    expect(getContextLabel({ source: 'manual' })).toBe('Manual input');
  });

  test('returns "Text from Safari" for app source with appName', () => {
    expect(getContextLabel({ source: 'app', appName: 'Safari' }))
      .toBe('Text from Safari');
  });

  test('returns "Text from Unknown app" for app source with null appName', () => {
    expect(getContextLabel({ source: 'app', appName: null }))
      .toBe('Text from Unknown app');
  });
});

// --- shouldShowDraftReply ---

describe('shouldShowDraftReply', () => {
  test('returns true for mail viewer', () => {
    expect(shouldShowDraftReply({ source: 'mail', type: 'viewer' })).toBe(true);
  });

  test('returns true for mail mailbox', () => {
    expect(shouldShowDraftReply({ source: 'mail', type: 'mailbox' })).toBe(true);
  });

  test('returns false for mail compose', () => {
    expect(shouldShowDraftReply({ source: 'mail', type: 'compose' })).toBe(false);
  });

  test('returns false for app selection', () => {
    expect(shouldShowDraftReply({ source: 'app', type: 'selection' })).toBe(false);
  });

  test('returns false for clipboard', () => {
    expect(shouldShowDraftReply({ source: 'clipboard', type: 'clipboard' })).toBe(false);
  });
});
