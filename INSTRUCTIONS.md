# Instructions

## Setup Instructions

1. Open the project in your IDE (VSCode recommended).
2. Install dependencies using pnpm:
   ```bash
   pnpm install
   ```
3. Configure your environment variables in a `.env` file (see [Prerequisites](#prerequisites)).
4. Prepare your event data files in the designated folder.

## Prerequisites

- **Node.js**: Version 18 or higher.
- **pnpm**: Recommended package manager.
- **Telegram Bot**: A bot token from [@BotFather](https://t.me/botfather).
- **Chat ID**: The ID of the Telegram chat or channel where notifications will be sent.
- **Environment Variables**:
  - `TOKEN`: Your Telegram Bot API token.
  - `CHAT_ID`: Your target chat ID.
  - `BOT_USERNAME`: Your bot's username.
  - `TARGET_USERNAME`: The title/username of the target chat for validation.

## Configuration

### Main Settings

Configuration is managed via `src/settings/settings.ts` and the `.env` file.

#### Production vs Development Mode

- **Production**: Run with `pnpm start` or `pnpm start:live`.
- **Development**: Use `pnpm dev` for hot-reloading during development.
- The bot performs validation on every run to ensure it doesn't send duplicate messages for the same day.

#### Goal Settings

- The primary goal of this bot is to send exactly one notification per day.
- Success is tracked in `db/days.json`.

#### Method Settings

- **Telegram API**: Uses standard POST requests to `sendMessage`.
- **File System**: Reads yearly event files (e.g., `event-dates-2026.txt`).

#### MongoDB Settings

- This project **does not use MongoDB**.
- Persistence is handled via a local JSON file located at `db/days.json`.
- This ensures the bot is lightweight and has zero external database dependencies.

#### Search Settings

- **File Search**: The bot searches for today's date in a local text file.
- **Timezone**: Date calculations are pinned to Jerusalem time (`Asia/Jerusalem`).

#### Process Limits

- The bot is designed to be run once per day (e.g., via a cron job).
- It executes the full flow (Validate -> Fetch -> Send -> Record) and then exits.

#### Logging Options

- Execution progress is logged directly to the console.
- Errors are caught and displayed with descriptive messages before the process exits with code 1.

### Search Engines Configuration

- This project **does not use search engines**.
- Instead, it relies on a local directory of text files containing scheduled events.

### Search Keys Configuration

- Events are identified by a date string at the beginning of a line.
- Expected format: `DD/MM/YYYY Weekday.` (e.g., `04/05/2026 Monday.`).

### Filter Configurations

#### Email Address Filters

- **N/A**: This bot does not process email addresses.

#### Link Filters

- **N/A**: This bot does not crawl web links.

#### File Extension Filters

- The bot specifically looks for `.txt` files named `event-dates-YYYY.txt`.

### Email Domain Configurations

- **N/A**: No email domain processing is performed.

## Running Scripts

### Main Crawler (with Monitor)

To run the bot in its standard mode:
```bash
pnpm start
```
This will:
1. Initialize the DI container.
2. Check if today's date is already in `db/days.json`.
3. Validate Telegram credentials.
4. Fetch and send today's events.

### Backup

You can manually back up your `db/days.json` and event files to a secure location.

### Domain Counter

- **N/A**: Domain counting is not applicable to this project.

### Tests

The project uses **Vitest** for testing.

#### Validate Single Email

- **N/A**: Use `pnpm test` to run available unit tests for `TelegramService` and `EventFileService`.

#### Validate Multiple Emails

- **N/A**.

#### Debug Email Validation

- **N/A**.

#### Test Typos

- **N/A**.

#### Test Link Crawling

- **N/A**.

#### Test Session Links

- **N/A**.

#### Email Generator Test

- **N/A**.

#### Test Cases

- Run `pnpm test` to execute all test cases in the `src/__tests__` directory.

#### Sandbox

- You can use `src/index.ts` or create a temporary script to test specific service integrations.

## Quick Start Guide

### For Testing (Development Mode)

1. Set up `.env` with test credentials.
2. Run `pnpm dev`.
3. The bot will reload automatically as you make changes.

### For Production Crawling

1. Ensure `db/days.json` is initialized (or it will be created automatically).
2. Schedule the `pnpm start` command using Task Scheduler (Windows) or Cron (Linux).
3. Ensure the `dailyFolderPath` in `settings.ts` points to your actual event files.

## File Structure

### Source Files (src/)

- `bot.ts`: Main logic orchestration.
- `services/`: Implementation of Telegram, File, and Database logic.
- `di/`: Dependency injection setup using Inversify.
- `utils/`: Date formatting and localization utilities.
- `settings/`: Static configuration and file paths.

### Output Files (dist/)

- Compiled JavaScript files are placed in the `dist/` folder when running `pnpm build`.

## Understanding the Console Status Line

The bot provides clear step-by-step logs:
- `1. Checking if message for today already sent`
- `2. Validating bot and chat`
- `3. Fetching events from file`
- `4. Sending message`
- `5. Marking date as sent`

## Troubleshooting

### Application Won't Start

- Check if `node_modules` are installed: `pnpm install`.
- Verify `.env` file exists and contains all required keys.

### No Email Addresses Being Found

- **N/A**: Ensure your `event-dates-YYYY.txt` file contains a line starting with today's date in the correct format.

### Puppeteer Errors

- **N/A**: This bot uses the Telegram Bot API via `fetch`, not Puppeteer.

### MongoDB Connection Errors

- **N/A**: The bot uses a local JSON file. Ensure the application has write permissions to the `db/` directory.

### Application Keeps Restarting

- If running in watch mode (`pnpm dev`), check for syntax errors in your code.

## Important Notes

- **Separators**: Use `===` or `###` in your event files to mark the end of a day's events.
- **Jerusalem Time**: The bot uses Jerusalem time regardless of the server's local time.
- **One-time Send**: Once a date is marked in `db/days.json`, the bot will not send it again unless the entry is manually removed.

## Author

- **Or Assayag** - _Initial work_ - [orassayag](https://github.com/orassayag)
- Or Assayag <orassayag@gmail.com>
- GitHub: https://github.com/orassayag
- StackOverflow: https://stackoverflow.com/users/4442606/or-assayag?tab=profile
- LinkedIn: https://linkedin.com/in/orassayag
