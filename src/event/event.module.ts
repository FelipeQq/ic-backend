import { Module } from '@nestjs/common';
import { EventService } from './event.service';
// sistema migrado para https://eventos.iccidadeverde.com/ — rotas desativadas
// import { EventController } from './event.controller';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [MailModule],
  // controllers: [EventController],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
