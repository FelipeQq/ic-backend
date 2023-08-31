import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { EventModule } from './event/event.module';
import { BedroomsModule } from './bedrooms/bedrooms.module';
import { TeamModule } from './team/team.module';

@Module({
  imports: [PrismaModule, UserModule, EventModule, BedroomsModule, TeamModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
