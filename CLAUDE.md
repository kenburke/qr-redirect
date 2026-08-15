# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**qr-redirect** is a Cloudflare Workers project that serves a QR code pointing to a configurable redirect URL. It includes:

- **Public-facing endpoint** (`/`): redirects to the current target URL, with analytics tracking
- **Admin interface** (`/admin`): update the redirect target with password + CAPTCHA protection, plus a manual "Sync Now" trigger for the auto-update below
- **Analytics dashboard** (`/admin/dash`): visualize redirects, failures, error counts, and auto-update run history
- **Export endpoints** (`/admin/export/`): download analytics and redirect history as CSV
- **Auto-update**: a daily cron scrapes cleanupthecity.org for the current week's volunteer check-in link and keeps `target` in sync automatically — see below

State is persisted in a Cloudflare KV namespace (`REDIRECT_KV`): target URL, redirect history (last 10), per-date analytics (last 1000 days), the scraped link cache, and auto-update run logs.

## Deployment

Deploy with `wrangler deploy` from the repo root. The worker binds to the KV namespace specified in `wrangler.toml` and runs a daily cron trigger (`0 15 * * *`, ~8am Pacific).

`ADMIN_PASSWORD`, `CLEANUP_EMAIL`, `CLEANUP_PASSWORD`, and `RESEND_API_KEY` are Worker **secrets** (`wrangler secret put <NAME>`), not `[vars]` — they're never committed. `RATE_LIMIT`/`RATE_WINDOW` remain plain `[vars]` in `wrangler.toml`.

## Architecture

**Routing** (`src/routes.js`): HTTP method + path dispatcher that maps requests to handler functions.

**Handlers** (`src/handlers.js`):
- `serveLanding()`: admin landing page with current target, QR code, collapsible history, failure banner, and Sync Now button
- `serveUpdateForm()`: password + CAPTCHA form for updating redirect
- `handleUpdate()`: validate CAPTCHA/password, enforce rate limits, save new target, update history (tagged `source: "manual"`)
- `handleRedirect()`: fetch current target from KV and 302 redirect
- `serveStats()` / `serveDashboard()`: analytics JSON and HTML dashboard (includes auto-update run history)
- `handleSyncSchedule()` / `handleSyncStatus()`: manual trigger (password-gated, runs via `ctx.waitUntil` and returns immediately) and live-progress polling endpoint for the auto-update scraper
- `exportAnalytics()` / `exportHistory()`: CSV exports

**Analytics** (`src/analytics.js`): `updateAnalytics(type)` increments counters by event type (`success`, `redirects`, `captcha`, `password`, `rateLimit`) for today's date in KV.

**Templates** (`src/templates.js`): HTML template functions returning response strings.

**Auto-update** (`src/scraper.js`, `src/dates.js`, `src/alerts.js`): logs into cleanupthecity.org (plain form POST — no headless browser needed; cookies are forwarded manually since Workers' `fetch()` has no cookie jar), scrapes the Castro cleanup's event list (`/organizer/cleanups/19`) for date → check-in URL pairs, and caches them in KV under `schedule`. Separately, it computes the *actual next calendar Saturday* (`nextCalendarSaturday()` in `dates.js`) and looks that specific date up in `schedule` — deliberately not "whichever date is soonest in the cache" — because cleanupthecity.org can publish more than one week ahead, and a naive nearest-match would risk jumping to the wrong week if the current week's scrape had a gap. If the computed date's URL differs from `target`, it's promoted (history tagged `source: "auto"`); if identical, it's a no-op; if the expected date isn't cached at all, that's logged as a failure and triggers alerting. Runs daily via `addEventListener('scheduled', ...)` in `src/index.js`, or on demand via `/admin/sync-schedule`. Every run is logged to KV `scrapeRuns` (capped at 30) for the dashboard.

**Alerting** (`src/alerts.js`): on scrape failure or a still-missing expected-Saturday link, emails via Resend (not MailChannels — MailChannels' free tier requires a DNS-verified custom domain, which this project doesn't have on the bare `workers.dev` subdomain).

## Key Implementation Details

- **History**: stored as JSON array in KV, newest-first; capped at 10 entries; each entry has `source: "manual"` or `"auto"` (older pre-existing entries have no `source` field)
- **Analytics**: daily bucketing by ISO date string; capped at 1000 days to prevent unbounded growth
- **Rate limiting**: per-IP with `rate:<ip>` keys in KV; TTL auto-expires after window
- **Update validation**: CAPTCHA (random arithmetic) + fixed password + prevents self-redirects; the update form shows a confirm dialog with the exact URL before submitting and echoes it back on success, specifically to catch browser-autofill mistakes overriding a pasted URL
- **QR code**: hosted on GitHub raw CDN (`raw.githubusercontent.com/kenburke/qr-redirect/main/qr.png`) rather than bundled, so updates don't require redeployment
- **`schedule` KV key**: JSON map `{ "YYYY-MM-DD": "checkin URL" }`; entries older than 60 days are pruned on each scrape run
- **`scrapeStatus` KV key**: ephemeral `{state, currentStage, startedAt}` for the in-flight run only, polled by the admin page's Sync Now button
- **cleanupthecity.org login is fragile by nature**: it's HTML scraping against a third party's UI with no API contract. A login failure is *also* a 302 (redirects back to `/users/log_in` instead of `/`), so `login()` in `scraper.js` explicitly checks the redirect `Location`, not just the status code — a wrong-credentials failure and a page-structure change can otherwise look identical to a naive status check. If cleanupthecity.org changes its page structure, the manual `/admin/update` flow is the fallback.
