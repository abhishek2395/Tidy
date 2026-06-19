# Tidy — clipboard, but smart

A Chrome extension by Wobble Studio. Press a shortcut after copying anything.
Transform the clipboard before pasting — clean it, change tone, summarize, extract.

## Brand
- Part of Wobble Studio (see `../wobble-studio/` for the parent site)
- Same design language: Fraunces (display), DM Mono (technical), Inter Tight (body)
- Colors: `--ink`, `--paper`, `--cream`, `--tomato`, `--lemon`, `--grass`, `--sky`, `--grape`, `--bubble`
- Signature: 3px ink borders, hard offset shadows, italic tomato accents, wobble/jiggle animations
- Voice: warm, confident, occasionally playful. Never corporate.

## Core promise
- **BYOK = no servers in the loop.** Your clipboard goes straight from the
  browser to the AI provider you chose (Gemini, Anthropic, OpenAI). There is
  no backend we control on that path.
- **Free tier (5 AI transforms/day)** runs through a tiny Cloudflare Worker
  proxy we host (see `worker/`). The proxy does NOT log clipboard content —
  only request counts, anonymized, for quota enforcement. Worker source is
  public and linked from the extension popup.
- **Clean and Extract** are always free, always instant, and never leave the
  browser (no AI, no network).
- Default free-tier model: Gemini 2.5 Flash-Lite.

## Stack
- Manifest V3 Chrome extension
- Vite + `@crxjs/vite-plugin`
- React 18 + TypeScript (strict) + Tailwind v4 (`@tailwindcss/vite`)
- No backend. All AI calls are browser → provider direct.
- `chrome.storage.local` for quota, `chrome.storage.sync` for API key (cross-device)
- PostHog for analytics (events only, no PII) — planned, not wired yet

## v1.0 scope (locked)
Transforms in launch:
- 🧹 Clean (free, instant): strip formatting, fix whitespace
- 📤 Extract (free, instant): emails, URLs, phones, dates (submenu)
- ✨ Polish (AI): fix grammar, preserve tone
- 🎯 Concise (AI): shorter, same meaning
- 💼 Professional (AI): formal tone
- 😊 Friendly (AI): casual tone
- 📝 Summarize (AI): TL;DR

Out of scope for v1.0:
- Custom prompts (v1.1)
- Per-app smart defaults (v1.2)
- Translate (v1.2)
- Clipboard history (different product — will not build)
- In-place text replacement (clipboard-first is the wedge)

## UX principles
- **Speed is the product.** Chip <100ms. Free transforms <500ms. AI <3s.
- Keyboard-first. Every transform has a single-letter shortcut.
- Original clipboard always recoverable (undo).
- Never modify the clipboard until the user explicitly confirms.
- Quota counter is small and ambient, not pushy.
- BYOK upgrade is "unlock unlimited", never "you've hit a limit, pay us."

## Architecture

```
src/
├── background/
│   └── service-worker.ts   # Listens for Cmd+Shift+Y, messages content script
├── content/
│   ├── inject.ts           # Content-script entry, owns chip lifecycle
│   ├── Chip.tsx            # React chip component
│   └── chip.css            # Vanilla CSS, injected into shadow DOM
├── popup/
│   ├── index.html
│   ├── main.tsx
│   ├── Popup.tsx           # BYOK settings, quota
│   └── popup.css
├── lib/
│   ├── transforms.ts       # Canonical list of v1.0 transforms
│   └── strings.ts          # All user-facing copy, i18n-ready
└── types.ts                # Shared message + transform types
```

### Why Shadow DOM
The chip is mounted inside a closed-style Shadow DOM (`mode: 'open'` but no
inheritance) so host-page CSS can't bleed in. Styles live in `chip.css`,
imported as a raw string via `?inline` and dropped into a `<style>` tag inside
the shadow root.

### Message flow
1. User presses **Cmd/Ctrl + Shift + Y** anywhere on a page.
2. `service-worker.ts` receives `chrome.commands.onCommand("open-tidy")`.
3. SW sends `{type: 'open-chip'}` to the content script in the active tab.
4. Content script reads the clipboard, mounts the chip near the last cursor
   position, focuses the first transform button.
5. User picks a transform via click or letter shortcut (C, X, P, S, B, F, M).
6. Transform runs (Clean/Extract instant; AI streams in). Result lands in the
   clipboard and the chip closes.

(v0.1 implements 1–4 + dismiss. Steps 5–6 land in week 1–2.)

## Performance budgets
- Chip render: **<100ms** from shortcut press
- Free transforms (Clean, Extract): **<500ms** total
- AI transforms: streaming starts **<2s**, complete **<5s** for typical text
- Extension bundle: **<500KB** total
- Permissions: minimal — no host permissions, no tabs, no history

## Conventions
- Components: **PascalCase**, named exports
- Files: kebab-case (except React components)
- Types: shared in `src/types.ts`; per-feature types inline
- All AI prompts in `src/ai/prompts.ts` — **never inlined**
- All user-facing copy in `src/lib/strings.ts` — even though we ship English-only
- Commit messages: conventional commits (`feat:`, `fix:`, `docs:`, etc.)

## Dev workflow
```sh
npm run dev          # Vite dev server, HMR for popup; rebuilds content/background on save
npm run build        # Production build → dist/
npm run typecheck    # tsc --noEmit
```

To install in Chrome during dev:
1. Run `npm run build` once.
2. `chrome://extensions/` → enable "Developer mode" (top right).
3. "Load unpacked" → select the `dist/` folder.
4. Pin Tidy from the extensions menu.
5. Press **Cmd/Ctrl + Shift + Y** on any normal web page.

The dev command keeps the build incremental — reload the extension in Chrome
to pick up content-script / service-worker changes; popup HMR works without
a reload.

## What "done" looks like for v1.0
- All 7 transforms work
- 5/day free quota enforced
- BYOK for 3 providers works (Gemini, Anthropic, OpenAI)
- Onboarding shows the shortcut to new users
- Submitted to Chrome Web Store
- Listed on `wobble.studio/apps/tidy`
- PostHog tracking WAU, transforms used, BYOK conversion

## Known TODOs (pre-launch)
- [x] Wire Clean transform (instant, no AI)
- [x] Wire Extract transform (instant, no AI)
- [x] Decide on free-tier key strategy → **Cloudflare Workers proxy** (see `worker/`)
- [x] Worker scaffolded with mock + Gemini providers, KV-backed 5/day quota
- [ ] Replace placeholder tomato-square icons in `public/icons/` (16/32/48/128 PNG)
- [ ] Generate + persist `client_id` UUID in `chrome.storage.sync`
- [ ] Wire SW → Worker `/v1/transform` for the 5 AI transforms (JSON first, no streaming)
- [ ] Streaming: pipe Worker SSE through SW port to chip result view
- [ ] BYOK code path: settings UI in popup + direct-fetch providers (Gemini, Anthropic, OpenAI)
- [ ] Quota UI in chip (counter, 429 'out of free' state)
- [ ] Onboarding modal on first install (show the shortcut)
- [ ] PostHog analytics events (5 minimal events)
- [ ] Deploy Worker to Cloudflare (real KV namespace, real Gemini key, $10/mo spend cap)
- [ ] Chrome Web Store listing (screenshots, demo gif, copy, privacy policy URL)
