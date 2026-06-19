// All user-facing copy lives here. English-only for v1.0 — structured this way
// to make i18n a refactor, not a rewrite.

export const strings = {
  chip: {
    title: 'Tidy',
    subtitle: 'transform your clipboard',
    emptyClipboard: 'Nothing to transform — copy something first.',
    clipboardLabel: 'On your clipboard:',
    quotaLabelFree: 'free transforms today',
    quotaLabelByok: 'using your own key — unlimited',
    quotaExhausted: 'Out of free transforms. Add an API key for unlimited.',
    actionApply: 'Copy & paste',
    actionDismiss: 'Dismiss',
    actionBack: 'Back',
    actionRecover: 'Bring back original',
    hintEscape: 'Esc to dismiss',
    hintConfirm: 'Enter to copy',
    resultLabelClean: 'Cleaned',
    resultLabelExtract: 'Extracted',
    resultEmpty: 'Nothing changed — your text was already clean.',
    resultExtractEmpty: 'No emails, URLs, phones, or dates found.',
    aiNotReady: 'AI transforms ship in the next update. Try Clean or Extract — those are live.',
    copying: 'Copied ✓',
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
