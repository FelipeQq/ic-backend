import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
// sistema migrado para https://eventos.iccidadeverde.com/ — rotas desativadas
// import { PaymentController } from './payment.controller';
import { PrismaService } from 'src/prisma/prisma.service';

import { PagbankModule } from 'src/gateways/pagbank/pagbank.module';

@Module({
  imports: [PagbankModule],
  // controllers: [PaymentController],
  providers: [PaymentService, PrismaService],
  exports: [PaymentService],
})
export class PaymentModule {}
