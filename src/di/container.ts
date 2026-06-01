import { Container } from 'inversify';
import 'reflect-metadata';
import { TYPES } from '../types/index.js';
import {
  TelegramService,
  EventFileService,
  DatabaseService,
} from '../services/index.js';
import { DailyEventsBot } from '../core/index.js';
import { Logger } from '../logging/index.js';

const container = new Container();

container.bind<Logger>(TYPES.Logger).to(Logger).inSingletonScope();
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
