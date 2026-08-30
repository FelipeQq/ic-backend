import { Module } from '@nestjs/common';
// sistema migrado para https://eventos.iccidadeverde.com/ — rotas desativadas.
// ATENÇÃO: com o controller comentado, este backend deixa de receber as
// notificações de pagamento do PagBank.
// import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PaymentModule],
  // controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
