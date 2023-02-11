import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { UserModule } from './modules/user/user.module';
import { EventModule } from './modules/event/event.module';
import { BedroomsModule } from './modules/bedrooms/bedrooms.module';

@Module({
  imports: [PrismaModule, UserModule, EventModule, BedroomsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
