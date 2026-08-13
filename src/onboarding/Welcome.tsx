import { useEffect, useState } from 'react';

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
const SHORTCUT_LABEL = isMac ? '⌘⇧Y' : 'Ctrl+Shift+Y';

/** Persisted flag key. Set to true after user hits "Got it" — the SW
 *  reads this and skips reopening welcome on future onInstalled events
 *  (which fire on updates too). */
const SEEN_KEY = 'tidy:welcome_seen';

export function Welcome() {
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    // Mark viewed as soon as they arrive — if they close the tab we still
    // don't reopen it. Explicit dismiss below just closes the tab.
    chrome.storage.local.set({ [SEEN_KEY]: true });
  }, []);

  const dismiss = () => {
    setDismissing(true);
    // Try to close the tab we're in; if that fails (chrome sometimes
    // refuses for pinned tabs), just leave the "farewell" state up.
    setTimeout(() => window.close(), 200);
  };

  const openShortcuts = () => {
    // Convenience: user can rebind the shortcut if the default conflicts.
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  };

  return (
    <main className={`welcome ${dismissing ? 'welcome-fade' : ''}`}>
      <header className="welcome-header">
        <div className="welcome-logo">
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <circle cx="20" cy="20" r="16" fill="#ff5b3a" stroke="#1a1814" strokeWidth="3" />
            <circle cx="14" cy="16" r="3" fill="#1a1814" />
            <circle cx="26" cy="16" r="3" fill="#1a1814" />
            <path
              d="M 13 25 Q 20 30 27 25"
              stroke="#1a1814"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="welcome-title-block">
          <h1 className="welcome-title">
            Welcome to <em>Tidy</em>.
          </h1>
          <p className="welcome-tagline">
            Clipboard, but smart. A Chrome extension by Wobble Studio.
          </p>
        </div>
      </header>

      <section className="welcome-steps">
        <ol>
          <li>
            <span className="step-num">1</span>
            <div className="step-body">
              <strong>Copy anything.</strong>
              <span>A paragraph, a code snippet, a messy email you're about to send.</span>
            </div>
          </li>
          <li>
            <span className="step-num">2</span>
            <div className="step-body">
              <strong>
                Press <kbd>{SHORTCUT_LABEL}</kbd> on any page.
              </strong>
              <span>
                A small chip pops up near your cursor.{' '}
                <button className="link-btn" onClick={openShortcuts}>
                  Rebind if you'd like →
                </button>
              </span>
            </div>
          </li>
          <li>
            <span className="step-num">3</span>
            <div className="step-body">
              <strong>Pick a transform.</strong>
              <span>The result replaces your clipboard. Paste anywhere.</span>
            </div>
          </li>
        </ol>
      </section>

      <section className="welcome-grid">
        <h2>What Tidy can do</h2>
        <div className="grid">
          <div className="grid-item free">
            <span className="grid-icon">🧹</span>
            <strong>Clean</strong>
            <span>Strip formatting, fix quotes and whitespace.</span>
            <span className="grid-tag">Instant · always free</span>
          </div>
          <div className="grid-item free">
            <span className="grid-icon">📤</span>
            <strong>Extract</strong>
            <span>Pull emails, URLs, phones, dates from any text.</span>
            <span className="grid-tag">Instant · always free</span>
          </div>
          <div className="grid-item ai">
            <span className="grid-icon">✨</span>
            <strong>Polish</strong>
            <span>Fix grammar without changing your voice.</span>
            <span className="grid-tag">AI · 5 free / day</span>
          </div>
          <div className="grid-item ai">
            <span className="grid-icon">🎯</span>
            <strong>Concise</strong>
            <span>Same meaning, fewer words.</span>
            <span className="grid-tag">AI · 5 free / day</span>
          </div>
          <div className="grid-item ai">
            <span className="grid-icon">💼</span>
            <strong>Professional</strong>
            <span>Rewrite in a formal tone for work.</span>
            <span className="grid-tag">AI · 5 free / day</span>
          </div>
          <div className="grid-item ai">
            <span className="grid-icon">😊</span>
            <strong>Friendly</strong>
            <span>Warm up a stiff draft.</span>
            <span className="grid-tag">AI · 5 free / day</span>
          </div>
          <div className="grid-item ai">
            <span className="grid-icon">📝</span>
            <strong>Summarize</strong>
            <span>TL;DR in 1–3 sentences.</span>
            <span className="grid-tag">AI · 5 free / day</span>
          </div>
          <div className="grid-item byok">
            <span className="grid-icon">🔑</span>
            <strong>Bring your own key</strong>
            <span>
              Add a Gemini / Claude / OpenAI key in the popup for unlimited use —
              your text goes direct to the provider, never through us.
            </span>
            <span className="grid-tag">Optional · privacy-first</span>
          </div>
        </div>
      </section>

      <section className="welcome-privacy">
        <h3>The privacy promise</h3>
        <ul>
          <li>
            <strong>Clean and Extract</strong> never leave your browser — they run as
            plain code on the page.
          </li>
          <li>
            <strong>Free-tier AI</strong> passes through a tiny proxy we run on
            Cloudflare on its way to Google Gemini. The proxy does not log your
            text — only counts requests so the 5/day limit can be enforced.
          </li>
          <li>
            <strong>Bring-your-own-key AI</strong> goes straight from your browser
            to the provider you chose. No Wobble server in the loop.
          </li>
        </ul>
        <p className="privacy-source">
          The full source is open —{' '}
          <a
            href="https://github.com/abhishek2395/Tidy"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/abhishek2395/Tidy
          </a>
          .
        </p>
      </section>

      <footer className="welcome-footer">
        <button className="btn-primary" onClick={dismiss}>
          Got it — let me try
        </button>
        <span className="footer-hint">
          You can reopen these instructions any time from the extension's page.
        </span>
      </footer>
    </main>
  );
}
