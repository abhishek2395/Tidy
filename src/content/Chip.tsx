import { useEffect, useMemo, useRef, useState } from 'react';
import { TRANSFORMS } from '../lib/transforms';
import { strings } from '../lib/strings';
import { clean } from '../transforms/clean';
import { extract, formatExtractResult, summarizeExtractResult, totalMatches } from '../transforms/extract';
import type { CursorAnchor, Transform } from '../types';

interface Props {
  anchor: CursorAnchor | null;
  clipboard: string;
  onDismiss: () => void;
  onConfirm: (text: string) => Promise<void> | void;
  quotaRemaining: number;
  quotaTotal: number;
  byok: boolean;
}

type View =
  | { kind: 'menu' }
  | { kind: 'result'; transform: Transform; output: string; summary: string; unchanged: boolean }
  | { kind: 'pending'; transform: Transform }
  | { kind: 'unavailable'; transform: Transform; message: string };

const CHIP_WIDTH = 360;
const CHIP_HEIGHT_ESTIMATE = 380;
const VIEWPORT_MARGIN = 16;

function clampPosition(anchor: CursorAnchor | null): { left: number; top: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let x = (anchor?.x ?? vw / 2) + 8;
  let y = (anchor?.y ?? vh / 2) + 8;
  if (x + CHIP_WIDTH + VIEWPORT_MARGIN > vw) x = vw - CHIP_WIDTH - VIEWPORT_MARGIN;
  if (y + CHIP_HEIGHT_ESTIMATE + VIEWPORT_MARGIN > vh) y = vh - CHIP_HEIGHT_ESTIMATE - VIEWPORT_MARGIN;
  if (x < VIEWPORT_MARGIN) x = VIEWPORT_MARGIN;
  if (y < VIEWPORT_MARGIN) y = VIEWPORT_MARGIN;
  return { left: x, top: y };
}

export function Chip({ anchor, clipboard, onDismiss, onConfirm, quotaRemaining, quotaTotal, byok }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { left, top } = clampPosition(anchor);
  const [view, setView] = useState<View>({ kind: 'menu' });
  const [copying, setCopying] = useState(false);

  const hasClipboard = clipboard.trim().length > 0;

  const runTransform = useMemo(
    () => (transform: Transform) => {
      const input = clipboard;
      if (transform.key === 'clean') {
        const { output, changes, before, after } = clean(input);
        const unchanged = output === input.trim();
        const summary = unchanged
          ? strings.chip.resultEmpty
          : changes.length
          ? `${changes.join(' · ')} · ${before} → ${after} chars`
          : `${before} → ${after} chars`;
        setView({ kind: 'result', transform, output, summary, unchanged });
        return;
      }
      if (transform.key === 'extract') {
        const result = extract(input);
        const count = totalMatches(result);
        const output = count ? formatExtractResult(result) : '';
        setView({
          kind: 'result',
          transform,
          output,
          summary: summarizeExtractResult(result),
          unchanged: count === 0,
        });
        return;
      }
      // AI transforms — not implemented yet
      setView({ kind: 'unavailable', transform, message: strings.chip.aiNotReady });
    },
    [clipboard]
  );

  const confirmCopy = async () => {
    if (view.kind !== 'result' || !view.output || view.unchanged) return;
    setCopying(true);
    await onConfirm(view.output);
    // brief visual confirmation, then close
    setTimeout(() => onDismiss(), 600);
  };

  const backToMenu = () => setView({ kind: 'menu' });

  // Keyboard: Esc dismisses; letter shortcuts only in menu view; Enter confirms in result view.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (view.kind === 'menu') onDismiss();
        else backToMenu();
        return;
      }
      if (view.kind === 'menu') {
        const upper = e.key.toUpperCase();
        const match = TRANSFORMS.find((t) => t.shortcut === upper);
        if (match && !e.metaKey && !e.ctrlKey && !e.altKey && hasClipboard) {
          e.preventDefault();
          runTransform(match);
        }
        return;
      }
      if (view.kind === 'result' && e.key === 'Enter' && !view.unchanged && view.output) {
        e.preventDefault();
        void confirmCopy();
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [view, hasClipboard, runTransform]);

  // Focus management: first action button when view changes
  useEffect(() => {
    const selector = view.kind === 'menu' ? '.chip-transform' : '.chip-action-primary, .chip-action-secondary';
    rootRef.current?.querySelector<HTMLButtonElement>(selector)?.focus();
  }, [view.kind]);

  const quotaLabel = byok ? strings.chip.quotaLabelByok : `${quotaRemaining}/${quotaTotal} ${strings.chip.quotaLabelFree}`;

  // Header subtitle changes per view
  const subtitle =
    view.kind === 'menu'
      ? strings.chip.subtitle
      : view.kind === 'result'
      ? view.transform.key === 'extract'
        ? strings.chip.resultLabelExtract.toLowerCase()
        : strings.chip.resultLabelClean.toLowerCase()
      : view.kind === 'pending'
      ? `running ${view.transform.label.toLowerCase()}…`
      : view.transform.label.toLowerCase();

  return (
    <div
      ref={rootRef}
      className="chip-root"
      role="dialog"
      aria-label={strings.chip.title}
      style={{ left: `${left}px`, top: `${top}px` }}
    >
      <header className="chip-header">
        <div className="chip-title">
          <span>{strings.chip.title}</span>
          <em>·</em>
          <span className="chip-subtitle">{subtitle}</span>
        </div>
        <button className="chip-close" onClick={onDismiss} aria-label={strings.chip.actionDismiss} type="button">
          ×
        </button>
      </header>

      {view.kind === 'menu' && (
        <>
          <div className="chip-preview">
            <div className="chip-preview-label">{strings.chip.clipboardLabel}</div>
            {hasClipboard ? (
              <div className="chip-preview-text">{clipboard}</div>
            ) : (
              <div className="chip-preview-text chip-preview-empty">{strings.chip.emptyClipboard}</div>
            )}
          </div>

          <div className="chip-transforms" role="menu">
            {TRANSFORMS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="menuitem"
                className="chip-transform"
                data-ai={t.ai ? 'true' : 'false'}
                disabled={!hasClipboard}
                onClick={() => runTransform(t)}
              >
                <span className="chip-transform-icon" aria-hidden="true">{t.icon}</span>
                <span className="chip-transform-label">{t.label}</span>
                <span className="chip-transform-key" aria-label={`Shortcut: ${t.shortcut}`}>{t.shortcut}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {view.kind === 'result' && (
        <>
          <div className="chip-result">
            <div className="chip-result-label">
              <span className="chip-result-icon" aria-hidden="true">{view.transform.icon}</span>
              <span>
                {view.transform.key === 'extract'
                  ? strings.chip.resultLabelExtract
                  : strings.chip.resultLabelClean}
              </span>
              <span className="chip-result-summary">· {view.summary}</span>
            </div>
            {view.unchanged ? (
              <div className="chip-result-empty">
                {view.transform.key === 'extract'
                  ? strings.chip.resultExtractEmpty
                  : strings.chip.resultEmpty}
              </div>
            ) : (
              <pre className="chip-result-text">{view.output}</pre>
            )}
          </div>

          <div className="chip-actions">
            <button
              type="button"
              className="chip-action-secondary"
              onClick={backToMenu}
            >
              ← {strings.chip.actionBack}
            </button>
            <button
              type="button"
              className="chip-action-primary"
              disabled={view.unchanged || !view.output || copying}
              onClick={confirmCopy}
            >
              {copying ? strings.chip.copying : strings.chip.actionApply}
            </button>
          </div>
        </>
      )}

      {view.kind === 'unavailable' && (
        <>
          <div className="chip-result">
            <div className="chip-result-label">
              <span className="chip-result-icon" aria-hidden="true">⚠️</span>
              <span>{view.transform.label}</span>
            </div>
            <div className="chip-result-empty">{view.message}</div>
          </div>
          <div className="chip-actions">
            <button type="button" className="chip-action-primary" onClick={backToMenu}>
              ← {strings.chip.actionBack}
            </button>
          </div>
        </>
      )}

      <footer className="chip-footer">
        <span className="chip-quota">
          <strong>{quotaLabel}</strong>
        </span>
        <span className="chip-hint">
          {view.kind === 'result' && !view.unchanged && view.output ? (
            <>
              <span className="chip-kbd">Enter</span> to copy ·{' '}
              <span className="chip-kbd">Esc</span> back
            </>
          ) : (
            <>
              <span className="chip-kbd">Esc</span> {view.kind === 'menu' ? 'to dismiss' : 'back'}
            </>
          )}
        </span>
      </footer>
    </div>
  );
}
