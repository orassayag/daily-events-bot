# CLAUDE.md

Guidance for working in this repository.

## What this is

`daily-events-bot` is an automated scheduler script (Node.js + TypeScript, ESM) that
reads a per-year events document, extracts the entries for the current day (Jerusalem
time), optionally appends task/detail reports, and sends the compiled message to a
Telegram chat — triggering a phone notification. It is meant to be run once or twice a
day by an OS scheduler (Windows Task Scheduler via `dailyEventsBot.bat`, or cron).

## Commands

| Task | Command |
|------|---------|
| Run once | `pnpm start` |
| Dry run (no Telegram send, prints message) | `pnpm dry` |
| Watch mode | `pnpm dev` |
| Tests (coverage) | `pnpm test` |
| Tests (no coverage) | `pnpm test:no-coverage` |
| Lint | `pnpm lint` |
| Format | `pnpm format` / `pnpm format:check` |

Node `>=20`, pnpm `>=8`. Entry point: `src/index.ts`.

## Architecture

Dependency injection via `inversify`. The container (`src/di/container.ts`) binds every
service as a singleton, keyed by `Symbol`s in `src/types/index.ts` (`TYPES`).

- `src/index.ts` — bootstrap + retry loop (`MAX_RETRIES`, global timeout) around
  `DailyEventsBot.run()`. Skips execution under `NODE_ENV=test`.
- `src/core/bot.ts` — `DailyEventsBot`: validates env vars, decides DAY vs NIGHT message,
  guards against >2 sends/day and the 9-hour minimum gap, then orchestrates fetch → send →
  mark-sent. Honors `DRY_MODE=true`.
- `src/services/eventFileService.ts` — reads `event-dates-<year>.txt` from the daily
  folder and extracts the current day's block; also extracts `#FOR-BOT#` sections from the
  ACTIONS/SCAN/BACKUP/PROJECTS report files.
- `src/services/telegramService.ts` — Telegram API calls (bot/chat validation, network
  wait, send).
- `src/services/databaseService.ts` — JSON-file record of which dates were already sent.
- `src/utils/dateUtils.ts` — Jerusalem-time date/day formatting and DAY/NIGHT heuristic.
- `src/logging/logger.ts` — the injected structured logger. Never use `console.*`.
- `src/settings/settings.ts` — machine-specific absolute paths (Windows). Not env-driven.

## Events document format

`event-dates-<year>.txt` lives in `settings.dailyFolderPath`. Structure:

- An optional **top section** before a `#EVENTS#` marker: loose date-tagged entries
  (birthdays, holidays) whose dates are matched against today in several `dd/MM/yyyy`
  variants.
- After `#EVENTS#`, a **main section** of day blocks. Each block is headed by a date-item
  title line `dd/MM/yyyy <hebrew-day>.` (e.g. `04/05/2026 שני.`), followed by content
  lines, terminated by a separator of `===`/`###` (3+ chars). Only `dd/MM/yyyy` is valid;
  `yyyy/mm/dd` and `mm/dd/yyyy` are not.

The file is **read-only** — never write to it.

## Config & secrets

Env vars (`.env`, see `.env.example`): `BOT_USERNAME`, `TARGET_USERNAME`, `TOKEN`,
`CHAT_ID`. Missing any → hard error at startup. Never log the token or chat id.

## Testing

Vitest, tests in `src/__tests__/`. `fs/promises` and network are mocked. Keep new logic
covered and mirror the existing test style (one service per file).
