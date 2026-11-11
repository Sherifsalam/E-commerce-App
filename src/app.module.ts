import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UserModule } from './user/user.module.js';
import { PostModule } from './post/post.module.js';
import { ChatModule } from './chat/app.module.js';
import { MessageController } from './message/message.controller.js';
import { MessageService } from './message/message.service.js';
import { MessageModule } from './message/message.module.js';
import { SecurityModule } from './common/security/security.module.js';
import { HashService } from './common/security/hash.service.js';
import { EncService } from './common/security/encryption.service.js';
import { buildSchema } from './common/models/user.model.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['./config/.env', '.env'],
      isGlobal: true,
    }),
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'E-commerce app',
    }),
    UserModule,
    PostModule,
    ChatModule,
    MessageModule,
    SecurityModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule, SecurityModule],
      inject: [ConfigService, HashService, EncService],
      useFactory: (
        configService: ConfigService,
        hashService: HashService,
        encService: EncService,
      ) => {
        buildSchema(hashService, encService);
        return {
          uri: configService.get<string>('DB_URI'),
          onConnectionCreate: (connection) => {
            connection.on('connected', () => {
              Logger.log('DB Connected successfully');
            });
            return connection;
          },
          serverSelectionTimeoutMS: 3000,
        };
      },
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        return {
          stores: [createKeyv('redis://127.0.0.1:6379')],
        };
      },
    }),
  ],
  controllers: [AppController, MessageController],
  providers: [AppService, MessageService],
})
export class AppModule {}
