import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { UserModule } from './modules/user/user.module';
import { EventModule } from './modules/event/event.module';

@Module({
  imports: [PrismaModule, UserModule, EventModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
