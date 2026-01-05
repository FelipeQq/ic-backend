import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentService } from '../payment/payment.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class WebhooksService {
  constructor(private readonly paymentService: PaymentService) {}

  async handlePagbankWebhook(payload: any) {
    /**
     * Exemplo de payload esperado:
     * {
     *   reference_id: 'paymentId',
     *   status: 'PAID'
     * }
     */

    const paymentId = payload.reference_id;
    const externalStatus = payload.status;

    if (!paymentId || !externalStatus) {
      throw new BadRequestException('Invalid webhook payload');
    }

    const status = this.mapStatus(externalStatus);

    return this.paymentService.updatePaymentStatus(paymentId, status);
  }

  private mapStatus(status: string): PaymentStatus {
    switch (status) {
      case 'PAID':
        return PaymentStatus.PAID;
      case 'CANCELED':
        return PaymentStatus.CANCELED;
      case 'REFUNDED':
        return PaymentStatus.REFUNDED;
      default:
        return PaymentStatus.PENDING;
    }
  }
}
