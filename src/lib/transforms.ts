import type { Transform } from '../types';

// Canonical list of v1.0 transforms. Order = display order in the chip.
export const TRANSFORMS: readonly Transform[] = [
  { key: 'clean',        label: 'Clean',        shortcut: 'C', icon: '🧹', ai: false },
  { key: 'extract',      label: 'Extract',      shortcut: 'X', icon: '📤', ai: false },
  { key: 'polish',       label: 'Polish',       shortcut: 'P', icon: '✨', ai: true  },
  { key: 'concise',      label: 'Concise',      shortcut: 'S', icon: '🎯', ai: true  },
  { key: 'professional', label: 'Professional', shortcut: 'B', icon: '💼', ai: true  },
  { key: 'friendly',     label: 'Friendly',     shortcut: 'F', icon: '😊', ai: true  },
  { key: 'summarize',    label: 'Summarize',    shortcut: 'M', icon: '📝', ai: true  },
] as const;
