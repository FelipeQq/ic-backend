import { Module } from '@nestjs/common';
import { BedroomsService } from './bedrooms.service';
import { BedroomsController } from './bedrooms.controller';

@Module({
  controllers: [BedroomsController],
  providers: [BedroomsService],
})
export class BedroomsModule {}
