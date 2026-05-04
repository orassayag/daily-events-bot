import { Container } from 'inversify';
import 'reflect-metadata';
import { TYPES } from './identifiers.js';
import { TelegramService } from '../services/telegramService.js';
import { EventFileService } from '../services/eventFileService.js';
import { DatabaseService } from '../services/databaseService.js';
import { DailyEventsBot } from '../bot.js';

const container = new Container();

container
  .bind<TelegramService>(TYPES.TelegramService)
  .to(TelegramService)
  .inSingletonScope();
container
  .bind<EventFileService>(TYPES.EventFileService)
  .to(EventFileService)
  .inSingletonScope();
container
  .bind<DatabaseService>(TYPES.DatabaseService)
  .to(DatabaseService)
  .inSingletonScope();
container
  .bind<DailyEventsBot>(TYPES.DailyEventsBot)
  .to(DailyEventsBot)
  .inSingletonScope();

export { container };
