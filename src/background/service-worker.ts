// Service worker — runs in the extension's background context.
// Responsibilities for v0.1:
//   1. Listen for the keyboard command "open-tidy"
//   2. Send a message to the content script in the active tab to show the chip
// Transforms, AI calls, and quota live here in future versions.

import type { ExtensionMessage } from '../types';

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'open-tidy') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const message: ExtensionMessage = { type: 'open-chip' };
  try {
    await chrome.tabs.sendMessage(tab.id, message);
  } catch (err) {
    // Content script not present (e.g. chrome:// pages, web store, file pages).
    // Silently no-op for v0.1; future: surface a toast via chrome.notifications.
    console.debug('[tidy] no content script on this tab', err);
  }
});

// First-install hook — used later for onboarding. Left intentionally minimal.
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    console.info('[tidy] installed');
  }
});
