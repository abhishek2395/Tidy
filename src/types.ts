// Shared types across background, content, and popup contexts.

export type TransformKey =
  | 'clean'
  | 'extract'
  | 'polish'
  | 'concise'
  | 'professional'
  | 'friendly'
  | 'summarize';

export interface Transform {
  key: TransformKey;
  label: string;
  shortcut: string; // single uppercase letter
  icon: string;
  ai: boolean;
}

// Messages between background ↔ content ↔ popup
export type ExtensionMessage =
  | { type: 'open-chip'; clientX?: number; clientY?: number }
  | { type: 'close-chip' }
  | { type: 'ping' };

export interface CursorAnchor {
  x: number;
  y: number;
}
