import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentService } from '../payment/payment.service';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PagbankChargeDto } from './dto/webhook-pagbank-payments.dto';

@Injectable()
export class WebhooksService {
  constructor(private readonly paymentService: PaymentService) {}

  async handlePagbankWebhookPayments(payloads: PagbankChargeDto[]) {
    for (const charge of payloads) {
      const referenceId = charge.reference_id;
      const status = this.mapStatus(charge?.status);
      const method = this.mapMethod(charge?.payment_method?.type);
      const payload = charge?.payment_method;
      this.paymentService.updatePayment(referenceId, status, method, payload);
    }
  }

  async handlePagbankWebhookCheckouts(payload: any) {
    const status = payload.status;
    const referenceId = payload.reference_id;
    return this.paymentService.updatePaymentCheckoutStatus(referenceId, status);
  }

  private mapMethod(method: string): PaymentMethod {
    switch (method) {
      case 'PIX':
        return PaymentMethod.PIX;
      case 'credit_card':
        return PaymentMethod.CREDIT_CARD;
      case 'debit_card':
        return PaymentMethod.DEBIT_CARD;
      case 'cash':
        return PaymentMethod.CASH;
      case 'BOLETO':
        return PaymentMethod.BOLETO;
      default:
        return PaymentMethod.OTHER;
    }
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
