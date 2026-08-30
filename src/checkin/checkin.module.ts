import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CheckinService } from './checkin.service';
// sistema migrado para https://eventos.iccidadeverde.com/ — rotas desativadas
// import { CheckinController } from './checkin.controller';
import { CheckinGateway } from './checkin.gateway';

@Module({
  // o gateway valida o token do handshake por conta própria: o guard HTTP não
  // roda em conexões WebSocket
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
    }),
  ],
  // controllers: [CheckinController],
  providers: [CheckinService, CheckinGateway],
})
export class CheckinModule {}
