# Tidy

Clipboard, but smart. A Chrome extension by [Wobble Studio](https://wobble.studio).

Press a shortcut after copying anything. Clean it up, change tone, summarize,
or extract emails / URLs / phones — without leaving your clipboard.

## Status

🚧 **v0.2 — pre-launch.**

- ✅ Floating chip UI matching the Wobble design system
- ✅ Keyboard shortcut launches chip near cursor (⌘⇧Y / Ctrl+Shift+Y)
- ✅ **Clean** transform — instant, no AI (strips HTML, fixes whitespace, smart quotes)
- ✅ **Extract** transform — instant, no AI (pulls emails / URLs / phones / dates)
- ✅ Cloudflare Worker AI proxy (in `worker/`) with mock + Gemini providers
- ⏳ AI transforms (Polish, Concise, Professional, Friendly, Summarize) — wired in worker, end-to-end loop in extension shipping next
- ⏳ BYOK direct-fetch path (skip the proxy with your own Gemini / Anthropic / OpenAI key)
- ⏳ Chrome Web Store submission

## Install (dev)

```sh
npm install
npm run build
```

Then in Chrome:
1. Visit `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and pick the `dist/` folder
4. Pin Tidy from the extensions menu
5. Press **Cmd/Ctrl + Shift + Y** on any normal web page

## Privacy

Tidy has two code paths for AI transforms:

- **Bring your own key (BYOK)** — your clipboard text goes straight from your
  browser to the AI provider you chose (Gemini, Anthropic, or OpenAI). It
  never touches a server we control. There is no backend to compromise.
- **Free tier (5/day)** — your clipboard text passes through a tiny proxy we
  run on Cloudflare on its way to Google's Gemini. The proxy *does not log
  your text*; it only counts requests so the 5/day free limit can be
  enforced. Its full source code is in [`worker/`](./worker/) — open and
  auditable.

**Clean** and **Extract** never leave your browser at all — they run as
regular code on the page, no network calls.

## Stack

- Manifest V3 Chrome extension
- Vite + `@crxjs/vite-plugin`
- React 18 + TypeScript strict + Tailwind v4 (`@tailwindcss/vite`)
- Cloudflare Workers proxy (free tier) — see [`worker/README.md`](./worker/README.md)
- `chrome.storage.local` for quota, `chrome.storage.sync` for BYOK API key

See [`CLAUDE.md`](./CLAUDE.md) for full project context and conventions.
See [`AI_PROXY_PLAN.md`](./AI_PROXY_PLAN.md) for the design rationale of the
proxy approach.

## License

MIT
