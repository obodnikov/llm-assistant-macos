/**
 * Context Detector - determines if source is Mail (premium) or generic.
 * Provides icon and label for the UI context indicator.
 * 
 * No electron dependency - pure functions only.
 */

function isMail(appName) {
  return appName === 'Mail';
}

function getContextIcon(context) {
  if (context.source === 'mail') return '📧';
  if (context.source === 'clipboard') return '📎';
  if (context.source === 'manual') return '✏️';
  return '📋';
}

function getContextLabel(context) {
  if (context.source === 'mail') {
    if (context.type === 'compose') return 'Composing email';
    if (context.type === 'viewer') {
      return `Email: ${(context.subject || '').substring(0, 40)}`;
    }
    return 'Mail';
  }
  if (context.source === 'clipboard') return 'Clipboard';
  if (context.source === 'manual') return 'Manual input';
  return `Text from ${context.appName || 'Unknown app'}`;
}

function shouldShowDraftReply(context) {
  return context.source === 'mail' &&
    (context.type === 'viewer' || context.type === 'mailbox');
}

module.exports = {
  isMail,
  getContextIcon,
  getContextLabel,
  shouldShowDraftReply
};
