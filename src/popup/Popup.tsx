import { useEffect, useState } from 'react';
import { strings } from '../lib/strings';

type Provider = 'gemini' | 'anthropic' | 'openai';

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'openai', label: 'OpenAI' },
];

const STORAGE_KEY = 'tidy:byok';

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

export function Popup() {
  const [provider, setProvider] = useState<Provider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  // Hydrate from chrome.storage.sync
  useEffect(() => {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      const v = result[STORAGE_KEY];
      if (v?.provider) setProvider(v.provider);
      if (v?.apiKey) setApiKey(v.apiKey);
    });
  }, []);

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    chrome.storage.sync.set({ [STORAGE_KEY]: { provider, apiKey: apiKey.trim() } }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  };

  return (
    <div className="popup">
      <header className="popup-header">
        <h1 className="popup-title">
          <span className="popup-logo-w">T</span>idy
        </h1>
        <p className="popup-tagline">{strings.popup.tagline}</p>
      </header>

      <section className="popup-section">
        <p className="popup-shortcut">
          {strings.popup.shortcutHint}{' '}
          <kbd className="popup-kbd">{isMac ? strings.popup.shortcutHintMac : strings.popup.shortcutHintOther}</kbd>
        </p>
      </section>

      <section className="popup-section">
        <h2 className="popup-heading">{strings.popup.settingsHeading}</h2>
        <form className="popup-form" onSubmit={onSave}>
          <label className="popup-field">
            <span className="popup-label">{strings.popup.providerLabel}</span>
            <select value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>
          <label className="popup-field">
            <span className="popup-label">{strings.popup.byokLabel}</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={strings.popup.byokPlaceholder}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button className="popup-save" type="submit">
            {saved ? 'Saved ✓' : strings.popup.saveButton}
          </button>
        </form>
      </section>
    </div>
  );
}
