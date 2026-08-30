import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
// import { CheckinService } from './checkin.service';
// sistema migrado para https://eventos.iccidadeverde.com/ — rotas desativadas
// import { CheckinController } from './checkin.controller';
// sem nenhum gateway registrado, o Nest não sobe o servidor socket.io e o
// endpoint HTTP /socket.io/ deixa de existir
// import { CheckinGateway } from './checkin.gateway';

@Module({
  // o gateway valida o token do handshake por conta própria: o guard HTTP não
  // roda em conexões WebSocket
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
    }),
  ],
  // controllers: [CheckinController],
  // ATENÇÃO ao reativar: o CheckinService injeta o CheckinGateway no
  // construtor, então os dois precisam voltar juntos — só o service quebra o
  // boot com erro de injeção de dependência.
  // providers: [CheckinService, CheckinGateway],
  providers: [],
})
export class CheckinModule {}
