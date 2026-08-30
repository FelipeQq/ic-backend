import { Module } from '@nestjs/common';
import { BedroomsService } from './bedrooms.service';
// sistema migrado para https://eventos.iccidadeverde.com/ — rotas desativadas
// import { BedroomsController } from './bedrooms.controller';

@Module({
  // controllers: [BedroomsController],
  providers: [BedroomsService],
})
export class BedroomsModule {}
