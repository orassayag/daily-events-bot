# Daily Events Bot

Automated scheduler script that compiles your daily tasks, holidays, birthdays, anniversaries, memorial dates, service expirations, and routine activities, then sends them via a Telegram bot to a chat, triggering mobile notifications that help you stay organized, consistent, and always on track.

Built to streamline personal organization, this Node.js application reads event data from local text files, validates the current date against a local database to prevent duplicate notifications, and communicates directly with the Telegram Bot API.

## Features

### Core Capabilities

- **Automated Daily Scheduling**: Fetches events for the current day automatically.
- **Telegram Integration**: Sends formatted event lists directly to a specified Telegram chat.
- **Jerusalem Timezone Support**: Specifically designed to operate on Jerusalem time with Hebrew day name support.
- **Local JSON Database**: Tracks sent notifications to ensure each day's events are only sent once.
- **Flexible Event Parsing**: Reads events from yearly text files with a simple, readable format.

### Technical Excellence

- **Dependency Injection**: Clean, testable service architecture with InversifyJS.
- **Type Safety**: Full TypeScript with strict type checking.
- **Comprehensive Testing**: Unit tests for core services and utilities using Vitest.
- **Modular Architecture**: Separated concerns between orchestration, data retrieval, and messaging.

### Developer Experience

- **Environment Management**: Simple `.env` based configuration.
- **Watch Mode**: `pnpm dev` for hot-reloading during development.
- **Clear Logging**: Step-by-step console output for easy troubleshooting.
- **Modern Tooling**: Powered by Vitest, ESLint, and Prettier.

- � **Automated Daily Scheduling**: Fetches events for the current day automatically.
- 🤖 **Telegram Integration**: Sends formatted event lists directly to a specified Telegram chat.
- � **Jerusalem Timezone Support**: Specifically designed to operate on Jerusalem time with Hebrew day name support.
- 🗄️ **Local JSON Database**: Tracks sent notifications to ensure each day's events are only sent once.
- 💉 **Dependency Injection**: Built with InversifyJS for a clean, modular, and testable architecture.
- � **Flexible Event Parsing**: Reads events from yearly text files with a simple, readable format.
- �️ **Validation Logic**: Validates both the bot's credentials and the target chat before sending messages.
- � **Comprehensive Testing**: Includes unit tests for core services and utilities using Vitest.

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- pnpm (or npm/yarn)
- A Telegram Bot Token (from @BotFather)
- A Target Telegram Chat ID

### Installation

1. Clone the repository:

```bash
git clone https://github.com/orassayag/daily-events-bot.git
cd daily-events-bot
```

2. Install dependencies:

```bash
pnpm install
```

3. Create a `.env` file based on `.env.example` and fill in your credentials:

```env
BOT_USERNAME=YourBotUsername
TARGET_USERNAME=YourTargetChatTitleOrUsername
TOKEN=your_telegram_bot_token
CHAT_ID=your_target_chat_id
```

### Quick Start

1. Ensure your event files are in the directory specified in `src/settings/settings.ts`.
2. Run the bot:

```bash
pnpm start
```

## Usage

### Running the Bot

To run the bot in its standard mode:

```bash
pnpm start
```

This will:

1. Initialize the DI container.
2. Check if today's date is already in `db/days.json`.
3. Validate Telegram credentials.
4. Fetch and send today's events.

### Development Mode

For development with hot-reloading:

```bash
pnpm dev
```

### Testing

Run the test suite using Vitest:

```bash
pnpm test
```

## Configuration

Edit `src/settings/settings.ts` to configure file paths:

- `dailyFolderPath`: The directory where your `event-dates-YYYY.txt` files are stored.
- `dbPath`: The path to the `days.json` file used for tracking sent dates.

Environment variables in `.env`:

- `BOT_USERNAME`: The username of your Telegram bot.
- `TARGET_USERNAME`: The title or username of the chat where messages will be sent.
- `TOKEN`: Your Telegram Bot API token.
- `CHAT_ID`: The unique identifier for the target chat.

## Available Scripts

- `pnpm start`: Runs the bot once.
- `pnpm dev`: Runs the bot in watch mode for development.
- `pnpm test`: Runs the test suite using Vitest.
- `pnpm build`: Compiles TypeScript to JavaScript.
- `pnpm lint`: Runs ESLint to check for code quality.
- `pnpm format`: Formats the code using Prettier.

## Project Structure

```
daily-events-bot/
├── db/                   # Local database storage
│   └── days.json         # Tracks sent notification dates
├── src/
│   ├── di/               # Dependency Injection configuration
│   ├── services/         # Core business logic (Telegram, File, Database)
│   ├── settings/         # Application settings and paths
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions (Date formatting)
│   ├── bot.ts            # Main bot orchestration logic
│   └── index.ts          # Entry point
├── src/__tests__/        # Unit tests
├── .env                  # Environment variables (private)
├── package.json          # Project configuration and dependencies
└── tsconfig.json         # TypeScript configuration
```

## Directory Structure

```
daily-events-bot/
├── .github/              # GitHub Actions and rulesets
├── .vscode/              # VS Code settings and snippets
├── db/                   # Persistence layer (JSON database)
├── logs/                 # Application logs and execution details
├── misc/                 # Miscellaneous planning and documentation
├── src/
│   ├── __tests__/        # Unit and integration tests
│   ├── constants/        # Application-wide constants and emojis
│   ├── core/             # Core business logic and orchestration
│   ├── di/               # InversifyJS container and configuration
│   ├── logging/          # Structured logging implementation
│   ├── services/         # Domain services (Telegram, File, DB)
│   ├── settings/         # Centralized configuration management
│   ├── types/            # TypeScript domain types
│   ├── utils/            # Shared utility functions
│   ├── bot.ts            # Main orchestration class
│   └── index.ts          # Application entry point
├── .env.example          # Environment variable template
├── .gitignore            # Git exclusion rules
├── .npmrc                # NPM configuration
├── .prettierrc           # Prettier formatting rules
├── CHANGELOG.md          # Version history
├── CODE_OF_CONDUCT.md    # Community standards
├── CONTRIBUTING.md       # Contribution guidelines
├── dailyEventsBot.bat    # Windows execution script
├── eslint.config.mjs     # ESLint configuration
├── INSTRUCTIONS.md       # Detailed setup instructions
├── LICENSE               # MIT License
├── package.json          # Dependency management and scripts
├── pnpm-lock.yaml        # Locked dependency versions
├── pnpm-workspace.yaml   # PNPM workspace configuration
├── README.md             # Project overview and documentation
├── SECURITY.md           # Security policy
├── tsconfig.json         # TypeScript configuration
└── vitest.config.ts      # Vitest testing configuration
```

## Architecture Principles

1. **Dependency Injection**: All services use `@injectable` decorators and are managed by InversifyJS.
2. **Single Responsibility**: Each service handles a specific domain (Telegram, File System, Database).
3. **Immutability**: Data structures are treated as immutable where possible.
4. **Localization**: Date and time handling is centralized and respects Jerusalem timezone requirements.
5. **Testability**: Pure functions and dependency injection enable easy unit testing.

## Design Patterns

- **Dependency Injection**: Services are loosely coupled via InversifyJS.
- **Orchestrator Pattern**: `DailyEventsBot` manages the high-level flow.
- **Service Pattern**: Business logic encapsulated in dedicated service classes.
- **Singleton Pattern**: Services are managed as singletons within the DI container.

## How It Works

```mermaid
graph TD
    Start[Start Bot] --> Init[Initialize DI Container]
    Init --> CheckEnv[Validate Environment Variables]
    CheckEnv --> GetDate[Get Jerusalem Date Info]
    GetDate --> CheckSent{Already Sent Today?}

    CheckSent -- Yes --> Exit[Exit: Already Sent]
    CheckSent -- No --> ValBot[Validate Bot Username]

    ValBot --> ValChat[Validate Target Chat]
    ValChat --> FetchEvents[Read event-dates-YYYY.txt]

    FetchEvents --> ParseEvents[Extract Today's Section]
    ParseEvents --> SendMsg[Send Message via Telegram]

    SendMsg --> MarkSent[Update db/days.json]
    MarkSent --> Success[Success: Exit]

    subgraph "Event Extraction"
        FetchEvents
        ParseEvents
    end

    subgraph "Telegram Service"
        ValBot
        ValChat
        SendMsg
    end
```

## Architecture Flow

1. **Entry Point**: `index.ts` resolves the `DailyEventsBot` from the DI container.
2. **Orchestration**: `DailyEventsBot.run()` manages the sequential flow of operations.
3. **Date Management**: `DateUtils` provides localized date info (Jerusalem time).
4. **Persistence**: `DatabaseService` handles reading/writing to `days.json`.
5. **Messaging**: `TelegramService` interacts with the Telegram Bot API.
6. **Data Retrieval**: `EventFileService` parses the raw text files for daily content.

## Email Validation Features

While this bot does not perform email validation, it implements strict **Event Data Validation**:

- **Date Matching**: Ensures events are only fetched for the exact current date.
- **Section Parsing**: Identifies the start and end of daily event sections using separators like `===` or `###`.
- **Format Integrity**: Validates that the event file exists and follows the expected yearly naming convention.
- **Duplicate Prevention**: Cross-references with the local database to avoid spamming the chat.

## Console Status Example

```
===Daily Events Bot Started===
Date: 04/05/2026
1. Checking if message for today already sent
2. Validating bot and chat
3. Fetching events from file
4. Sending message
5. Marking date as sent
===Success: Message sent===
```

## Output Files

- `db/days.json`: Stores a record of all dates for which a notification has been successfully sent.
- `logs/`: Execution details and errors are logged to the console.

## Development

- **Testing**: Run `pnpm test` to execute unit tests. The project uses Vitest for fast, reliable testing.
- **Mocking**: Services are designed to be easily mockable for testing purposes.
- **Formatting**: Ensure code quality by running `pnpm format` before contributing.

## Best Practices

1. **Regular Backups**: Back up your `db/days.json` and event files periodically.
2. **Environment Security**: Never commit your `.env` file or expose your Telegram token.
3. **Event Formatting**: Follow the `DD/MM/YYYY Weekday.` pattern for consistent event parsing.
4. **Log Monitoring**: Check console logs to ensure daily tasks are being processed and sent.
5. **Dependency Management**: Use `pnpm` for consistent dependency installation.

## Contributing

Contributions are welcome! Please follow the guidelines in `CONTRIBUTING.md`.

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Ensure all tests pass.
4. Submit a pull request.

## Built With

- [Node.js](https://nodejs.org/) - JavaScript runtime
- [TypeScript](https://www.typescriptlang.org/) - Typed superset of JavaScript
- [InversifyJS](https://inversify.io/) - Powerful and lightweight IoC container
- [Vitest](https://vitest.dev/) - Next generation testing framework
- [Telegram Bot API](https://core.telegram.org/bots/api) - For sending notifications

## Author

- **Or Assayag** - _Initial work_ - [orassayag](https://github.com/orassayag)
- Or Assayag <orassayag@gmail.com>
- GitHub: https://github.com/orassayag
- StackOverflow: https://stackoverflow.com/users/4442606/or-assayag?tab=profile
- LinkedIn: https://linkedin.com/in/orassayag

## Acknowledgments

- Built for educational and research purposes
- Respects robots.txt and implements rate limiting
- Uses user-agent rotation to avoid detection
- Implements polite crawling practices

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
