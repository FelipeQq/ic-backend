import { Module } from '@nestjs/common';
import { TeamService } from './team.service';
// sistema migrado para https://eventos.iccidadeverde.com/ — rotas desativadas
// import { TeamController } from './team.controller';

@Module({
  // controllers: [TeamController],
  providers: [TeamService],
})
export class TeamModule {}
