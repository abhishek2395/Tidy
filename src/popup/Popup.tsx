import { useEffect, useState } from 'react';
import { strings } from '../lib/strings';
import {
  clearByok,
  getByok,
  keyLooksSensible,
  keyMatchesExpectedFormat,
  PROVIDERS,
  setByok,
  type ProviderId,
} from '../lib/byok';

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string };

export function Popup() {
  const [provider, setProvider] = useState<ProviderId>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [existingKeySaved, setExistingKeySaved] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' });

  // Hydrate from storage
  useEffect(() => {
    void getByok().then((cfg) => {
      if (cfg) {
        setProvider(cfg.provider);
        setExistingKeySaved(true);
      }
    });
  }, []);

  const providerMeta = PROVIDERS.find((p) => p.id === provider)!;
  const canSave = keyLooksSensible(apiKey) && saveState.kind !== 'saving';
  // Soft warning: key doesn't match the canonical prefix we expect for this
  // provider. Still saveable — older/enterprise keys often use different
  // formats, and the provider is the real authenticator.
  const showFormatWarning =
    apiKey.trim().length >= 20 && !keyMatchesExpectedFormat(provider, apiKey);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaveState({ kind: 'saving' });
    try {
      await setByok({ provider, apiKey });
      setApiKey('');
      setExistingKeySaved(true);
      setSaveState({ kind: 'saved' });
      setTimeout(() => setSaveState({ kind: 'idle' }), 1800);
    } catch (err) {
      setSaveState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Save failed',
      });
    }
  };

  const onClear = async () => {
    await clearByok();
    setApiKey('');
    setExistingKeySaved(false);
    setSaveState({ kind: 'idle' });
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
          <kbd className="popup-kbd">
            {isMac ? strings.popup.shortcutHintMac : strings.popup.shortcutHintOther}
          </kbd>
        </p>
      </section>

      <section className="popup-section">
        <h2 className="popup-heading">{strings.popup.settingsHeading}</h2>

        {existingKeySaved && (
          <div className="popup-status popup-status-ok">
            <strong>Your {providerMeta.label} key is saved.</strong> AI transforms
            go direct to {providerMeta.label} — no quota, no proxy.
          </div>
        )}

        <form className="popup-form" onSubmit={onSave}>
          <label className="popup-field">
            <span className="popup-label">{strings.popup.providerLabel}</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as ProviderId)}
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>

          <label className="popup-field">
            <span className="popup-label">
              {strings.popup.byokLabel}
              {existingKeySaved && (
                <span className="popup-label-hint"> · replacing existing key</span>
              )}
            </span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`${providerMeta.keyHint} — your key, stored locally`}
              autoComplete="off"
              spellCheck={false}
            />
            {showFormatWarning && (
              <span className="popup-field-warn">
                Heads up — most {providerMeta.label} keys start with{' '}
                <code>{providerMeta.keyHint}</code>. Yours doesn't, but you can
                still save it. If the provider rejects it later, that's the tell.
              </span>
            )}
          </label>

          <div className="popup-actions">
            <button
              className="popup-save"
              type="submit"
              disabled={!canSave}
            >
              {saveState.kind === 'saving'
                ? 'Saving…'
                : saveState.kind === 'saved'
                ? 'Saved ✓'
                : existingKeySaved
                ? 'Replace key'
                : strings.popup.saveButton}
            </button>
            {existingKeySaved && (
              <button
                className="popup-clear"
                type="button"
                onClick={onClear}
              >
                Remove key
              </button>
            )}
          </div>

          {saveState.kind === 'error' && (
            <div className="popup-status popup-status-err">{saveState.message}</div>
          )}
        </form>

        <p className="popup-privacy">
          Your API key stays in this browser (synced across your own Chrome
          installs via <code>chrome.storage.sync</code>). Requests go directly
          from Tidy to your chosen provider — never through us.
        </p>
      </section>
    </div>
  );
}
