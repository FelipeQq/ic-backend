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
  ],
  controllers: [AuthController],
  providers: [],
})
export class AppModule {}
