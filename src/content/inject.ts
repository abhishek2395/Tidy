// Content script entry: lives in the page, owns the chip lifecycle.
//
// Lifecycle:
//   1. On install, listen for messages from the background service worker.
//   2. Track the last cursor position so the chip can anchor near the user's
//      intent (the spec wants "near where the user last clicked").
//   3. On "open-chip" message, read the clipboard, mount a Shadow DOM host,
//      render the React chip inside it.
//   4. Single chip at a time — re-opening replaces the existing instance.

import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { Chip } from './Chip';
import type { ExtensionMessage, CursorAnchor } from '../types';
import chipCss from './chip.css?inline';

const HOST_ID = 'tidy-chip-host';

let activeRoot: Root | null = null;
let activeHost: HTMLDivElement | null = null;
let lastCursor: CursorAnchor | null = null;

// Track the cursor so the chip anchors near the user's last interaction.
function trackCursor() {
  function update(e: MouseEvent) {
    lastCursor = { x: e.clientX, y: e.clientY };
  }
  // pointermove fires for mouse + pen + touch; cheap enough at default rate.
  document.addEventListener('pointermove', update, { passive: true });
  document.addEventListener('click', update, { passive: true });
}

function teardown() {
  if (activeRoot) {
    activeRoot.unmount();
    activeRoot = null;
  }
  if (activeHost) {
    activeHost.remove();
    activeHost = null;
  }
}

async function readClipboard(): Promise<string> {
  try {
    if (!navigator.clipboard?.readText) return '';
    return await navigator.clipboard.readText();
  } catch (err) {
    console.debug('[tidy] clipboard read failed', err);
    return '';
  }
}

async function mount() {
  teardown(); // ensure single instance

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.all = 'initial';
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '0';
  host.style.zIndex = '2147483647';
  host.style.pointerEvents = 'none'; // child chip sets auto

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = chipCss;
  shadow.appendChild(style);

  const mountPoint = document.createElement('div');
  mountPoint.style.pointerEvents = 'auto';
  shadow.appendChild(mountPoint);

  document.body.appendChild(host);
  activeHost = host;

  const clipboard = await readClipboard();
  const root = createRoot(mountPoint);
  activeRoot = root;

  const handleDismiss = () => teardown();
  const handleConfirm = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('[tidy] clipboard write failed', err);
    }
  };

  root.render(
    createElement(Chip, {
      anchor: lastCursor,
      clipboard,
      onDismiss: handleDismiss,
      onConfirm: handleConfirm,
      quotaRemaining: 5,
      quotaTotal: 5,
      byok: false,
    })
  );
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === 'open-chip') {
    void mount();
    sendResponse({ ok: true });
  } else if (message.type === 'close-chip') {
    teardown();
    sendResponse({ ok: true });
  } else if (message.type === 'ping') {
    sendResponse({ ok: true });
  }
  return true;
});

trackCursor();
