# Tidy — AI Proxy Plan (Cloudflare Workers)

## Why a proxy

Tidy's free tier costs us money. If we ship our Gemini key directly inside the
extension, anyone can extract it and burn through our budget. A tiny
serverless proxy in front of the AI providers lets us:

- Keep our API key server-side (only secret we manage)
- Enforce the 5/day free quota at the gateway (not on trust)
- Cap our monthly spend with one config knob
- Swap models or providers without shipping a new extension version

It also forces an honest rewrite of one part of the brand promise — see the
"Privacy" section below.

## Architecture

```
┌──────────────────┐                     ┌─────────────────────┐
│ Tidy extension   │                     │  tidy-api.<domain>  │
│  (browser)       │                     │  Cloudflare Worker  │
│                  │   POST /transform   │                     │
│  service-worker  ├────────────────────►│  rate limit (KV)    │
│  + content       │ ◄───── SSE ───────  │  fetch Gemini       │
│  scripts         │                     │  pipe stream back   │
└─────────┬────────┘                     └──────────┬──────────┘
          │                                         │
          │ BYOK path: direct fetch                 │
          │ never touches our worker                │
          └──────────────► Gemini / Anthropic / OpenAI ◄──┘
```

Two completely separate code paths in the extension:

- **Free tier** → our Worker → Gemini. Our Worker holds the key, enforces the
  quota, never logs content.
- **BYOK** → direct fetch from the extension to the user's chosen provider.
  Our infra is never in the loop.

The Worker exists only for free-tier callers. The privacy promise stays
identical for BYOK users: your clipboard never touches our servers.

## The privacy promise — rewritten honestly

Old (CLAUDE.md, currently aspirational):

> We have no servers. Your clipboard never leaves your machine except to go
> directly to your chosen AI provider.

New (honest):

> **Bring your own key** → your clipboard goes straight from your browser to
> the AI provider you chose. We can't see it, we have no servers in the loop.
>
> **Free tier** → your clipboard passes through a tiny proxy we run on
> Cloudflare on its way to Google's Gemini. The proxy does not log your text,
> only counts requests (anonymously) so we can enforce the free limit. The
> source code is open and linkable from the extension popup.

This is the version that ships in the popup and the Web Store listing. Less
catchy, more truthful. Long-term the proxy can be opt-out (BYOK-only by
default in v2) if that promise feels too compromised.

## Repo layout

The Worker lives inside the Tidy folder as a sibling to the extension, with
its own `package.json`, own build, own deploy. Co-located because they're
tightly coupled; isolated because the deploy targets are completely different.

```
tidy/
├── extension/             # ← MOVE current extension code here
│   ├── package.json
│   ├── src/
│   ├── manifest.config.ts
│   └── dist/
├── worker/                # ← new
│   ├── package.json
│   ├── src/
│   │   ├── index.ts       # entry point, routing
│   │   ├── transform.ts   # the /transform handler
│   │   ├── quota.ts       # KV-backed 5/day tracker
│   │   ├── gemini.ts      # provider adapter
│   │   └── log.ts         # privacy-safe logging
│   ├── wrangler.toml
│   └── tsconfig.json
├── README.md              # top-level: what's in each folder
└── CLAUDE.md
```

(Yes, this means moving the current `src/`, `manifest.config.ts`, etc. one
level down. Worth it for clarity — extension and worker have nothing in
common beyond a shared promise.)

## Worker responsibilities

`POST /v1/transform`

Request body:
```json
{
  "transform": "polish" | "concise" | "professional" | "friendly" | "summarize",
  "text": "the clipboard text",
  "client_id": "<anon UUID from extension>"
}
```

Headers:
- `X-Tidy-Version: 0.2.0` (so we can deprecate old clients)

Worker flow:
1. Validate request shape, reject anything malformed with 400
2. Look up `client_id` in KV: how many calls today? If ≥ 5 → 429 with
   `{ "reason": "quota_exceeded" }`
3. Increment counter (key: `quota:<client_id>:<YYYY-MM-DD>`, expires in 36h)
4. Look up the prompt for `transform` (server-side prompt library, version
   stamped so we can A/B improve them later)
5. Fetch Gemini Flash-Lite with `stream=true`
6. Pipe SSE chunks back to the extension with `Content-Type: text/event-stream`
7. Log: timestamp, hashed `client_id`, transform, input length, output length,
   latency, success/failure. **Never the content.**

Other endpoints (v1):
- `GET /v1/health` — for monitoring
- `GET /v1/quota?client_id=…` — extension calls this on chip open to show
  "3/5 remaining" without spending a request

## Identity & rate limiting

- On first install, extension generates a UUIDv4 → stored in
  `chrome.storage.sync` as `client_id`. Syncs across user's Chrome installs.
- This is what the worker uses as the rate-limit key.
- Trivially bypassable (clear storage → new UUID). That's fine: we'd rather
  let a determined abuser burn a free key than gate on real auth and lose
  90% of casual installs.
- Hard cap on Gemini side: $10/month spend cap initially, raise as we grow.
- If global cap is hit, Worker returns 503 with `{"reason": "budget_exceeded",
  "hint": "Add your own API key for unlimited."}` — that's the BYOK
  conversion moment.

## What the Worker logs (the whole list)

Per request: `timestamp, sha256(client_id), transform_key, input_len, output_len, latency_ms, status_code, error_code|null`

That's it. No clipboard text. No IP for analytics (Cloudflare keeps IP at the
edge for DDOS, we don't read it). No user agent string. The logging code is
small enough to fit on one screen and we'll point at it from the popup.

## Streaming pattern (extension side)

1. Content script: user picks AI transform → posts message to service worker
2. Service worker: opens `chrome.runtime.Port` to content script for stream
3. Service worker: `fetch(workerUrl, { ... })`, reads response as a ReadableStream
4. SW parses SSE chunks, posts each as `port.postMessage({ chunk: "..." })`
5. Content script appends chunks into the chip's result view as they arrive
6. SW closes port on completion; chip swaps to "Copy & paste" state

Why the SW does the fetch (not the content script): clean privacy boundary +
host_permissions are simpler to scope on the SW side.

## Pre-work checklist

Required before any code lands:

1. **Cloudflare account** — sign up at cloudflare.com (free)
2. **Wrangler CLI** — `npm install -D wrangler` in the worker folder
3. **Workers KV namespace** — create one called `TIDY_QUOTA`
4. **Gemini API key** — get one at aistudio.google.com (free tier)
5. **Secret upload** — `wrangler secret put GEMINI_API_KEY` (stored encrypted
   at Cloudflare, never in git)
6. **Domain decision** — `tidy-api.wobble.workers.dev` (free, instant) or
   custom subdomain on `wobble.studio` (5 min DNS, free)
7. **Gemini spend cap** — set $10/mo at console.cloud.google.com before
   launch

## Timeline estimate

Reusing your original week structure:

- **Worker MVP (2 days)** — endpoint + KV quota + Gemini call (no streaming).
  Tidy can hit it locally via `wrangler dev`. Free transforms work end-to-end
  but feel slow because no streaming.
- **Streaming (1 day)** — SSE pipe through, chip renders chunks live.
- **BYOK + provider abstraction (2 days)** — extension splits paths between
  worker fetch and direct provider fetch. Anthropic + OpenAI adapters in the
  extension (worker stays Gemini-only).
- **Quota UI + edge cases (1 day)** — 429 handling, 503 budget handling,
  offline state, "0/5 today" footer.
- **Deploy + Web Store submit (1 day)** — production wrangler deploy, update
  manifest with real worker URL, submit.

That's a week of focused work to get from where we are now to v1.0 launched.
Matches your week 2-3 of the original plan, with the Worker added.

## Open decisions for you

| # | Decision | Default if you don't pick |
|---|----------|--------------------------|
| 1 | Worker domain — `tidy-api.wobble.workers.dev` or `tidy.wobble.studio/api`? | `.workers.dev` for now, swap later |
| 2 | Repo move — fine to restructure to `tidy/extension/` + `tidy/worker/`? | I do it as the first step |
| 3 | Monthly Gemini spend cap to start? | $10/mo (~6,000 free calls — enough for ~200 weekly actives at 5 calls each) |
| 4 | OK to log per-request metadata (no content) for debugging? | Yes, fully anonymized |
| 5 | Open-source the worker code? | Yes — linked from popup. Builds trust on the privacy claim. |
| 6 | Pre-onboarding: do you want to handle CF signup + Gemini key yourself before I start coding, or pair through it interactively? | Pair through it |
