import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { EventModule } from './event/event.module';
import { BedroomsModule } from './bedrooms/bedrooms.module';
import { TeamModule } from './team/team.module';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { PagbankModule } from './gateways/pagbank/pagbank.module';
import { PaymentModule } from './payment/payment.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CronModule } from './cron/cron.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RequestContextInterceptor } from './middleware/request-context.middleware';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    EventModule,
    BedroomsModule,
    TeamModule,
    AuthModule,
    PagbankModule,
    PaymentModule,
    WebhooksModule,
    CronModule,
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
  ],
})
export class AppModule {}
