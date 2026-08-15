# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**qr-redirect** is a Cloudflare Workers project that serves a QR code pointing to a configurable redirect URL. It includes:

- **Public-facing endpoint** (`/`): redirects to the current target URL, with analytics tracking
- **Admin interface** (`/admin`): update the redirect target with password + CAPTCHA protection
- **Analytics dashboard** (`/admin/dash`): visualize redirects, failures, and error counts
- **Export endpoints** (`/admin/export/`): download analytics and redirect history as CSV

State is persisted in a Cloudflare KV namespace (`REDIRECT_KV`): target URL, redirect history (last 10), and per-date analytics (last 1000 days).

## Deployment

Deploy with `wrangler publish` from the repo root. The worker binds to the KV namespace specified in `wrangler.toml`.

Configuration lives in `wrangler.toml` under `[vars]`:
- `ADMIN_PASSWORD`: auth password for update form
- `RATE_LIMIT`: max update attempts per IP window (default 10)
- `RATE_WINDOW`: duration of rate-limit window in seconds (default 3600)

## Architecture

**Routing** (`src/routes.js`): HTTP method + path dispatcher that maps requests to handler functions.

**Handlers** (`src/handlers.js`):
- `serveLanding()`: admin landing page with current target, QR code, and collapsible history
- `serveUpdateForm()`: password + CAPTCHA form for updating redirect
- `handleUpdate()`: validate CAPTCHA/password, enforce rate limits, save new target, update history
- `handleRedirect()`: fetch current target from KV and 302 redirect
- `serveStats()` / `serveDashboard()`: analytics JSON and HTML dashboard
- `exportAnalytics()` / `exportHistory()`: CSV exports

**Analytics** (`src/analytics.js`): `updateAnalytics(type)` increments counters by event type (`success`, `redirects`, `captcha`, `password`, `rateLimit`) for today's date in KV.

**Templates** (`src/templates.js`): HTML template functions returning response strings. Currently large (437 lines) due to inline CSS for landing page, dashboard, and forms.

## Key Implementation Details

- **History**: stored as JSON array in KV, newest-first; capped at 10 entries
- **Analytics**: daily bucketing by ISO date string; capped at 1000 days to prevent unbounded growth
- **Rate limiting**: per-IP with `rate:<ip>` keys in KV; TTL auto-expires after window
- **Update validation**: CAPTCHA (random arithmetic) + fixed password + prevents self-redirects
- **QR code**: hosted on GitHub raw CDN (`raw.githubusercontent.com/kenburke/qr-redirect/main/qr.png`) rather than bundled, so updates don't require redeployment
