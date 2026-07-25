// All user-facing copy lives here. English-only for v1.0 — structured this way
// to make i18n a refactor, not a rewrite.

export const strings = {
  chip: {
    title: 'Tidy',
    subtitle: 'transform your clipboard',
    emptyClipboard: 'Nothing to transform — copy something first.',
    clipboardLabel: 'On your clipboard:',
    quotaLabelFree: 'free today',
    quotaLabelByok: 'your own key — unlimited',
    quotaExhausted: 'Out of free transforms. Add an API key for unlimited.',
    actionApply: 'Copy & paste',
    actionDismiss: 'Dismiss',
    actionBack: 'Back',
    actionRetry: 'Try again',
    actionRecover: 'Bring back original',
    hintEscape: 'Esc to dismiss',
    hintConfirm: 'Enter to copy',
    resultLabelClean: 'Cleaned',
    resultLabelExtract: 'Extracted',
    resultEmpty: 'Nothing changed — your text was already clean.',
    resultExtractEmpty: 'No emails, URLs, phones, or dates found.',
    pendingLabel: 'Running',
    copying: 'Copied ✓',
    // Error copy per Worker reason code.
    err: {
      quota_exceeded: {
        title: 'Out of free transforms',
        body: "You've used today's 5 free AI transforms. Free tier resets at midnight UTC.",
        hint: 'Add your own API key in the Tidy popup (click the toolbar icon) for unlimited.',
      },
      network_error: {
        title: "Can't reach Tidy",
        body: "The extension can't reach the proxy right now. Check your connection or try again.",
      },
      upstream_error: {
        title: 'AI provider hiccup',
        body: 'The AI provider rejected the request. Not your fault — usually a hiccup, try again.',
      },
      too_large: {
        title: 'Clipboard too large',
        body: 'Tidy caps text at 50 KB per transform. Shorten what you copied and try again.',
      },
      invalid_transform: {
        title: 'Unknown transform',
        body: "That transform isn't recognized. Reload the extension?",
      },
      missing_text: {
        title: 'Nothing to transform',
        body: 'Copy something first, then try again.',
      },
      invalid_client_id: {
        title: 'Reinstall needed',
        body: 'The client id is invalid. Reload the extension to regenerate it.',
      },
      invalid_json: {
        title: 'Bad request',
        body: 'The proxy rejected the request format. Reload the extension?',
      },
      internal_error: {
        title: 'Something broke',
        body: 'Something went wrong on our end. Try again in a moment.',
      },
      unknown_route: {
        title: 'Proxy not found',
        body: 'The Tidy proxy endpoint has moved. Update the extension.',
      },
    } as const,
  },
  popup: {
    title: 'Tidy',
    tagline: 'Clipboard, but smart.',
    settingsHeading: 'Settings',
    byokLabel: 'API key',
    byokPlaceholder: 'sk-... or AIza... — your key, stored locally',
    providerLabel: 'Provider',
    saveButton: 'Save',
    shortcutHint: 'Press the shortcut on any page to open Tidy.',
    shortcutHintMac: '⌘⇧Y',
    shortcutHintOther: 'Ctrl+Shift+Y',
  },
} as const;
