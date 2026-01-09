import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentService } from '../payment/payment.service';
import { CheckoutStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PagbankChargeDto } from './dto/webhook-pagbank-payments.dto';

@Injectable()
export class WebhooksService {
  constructor(private readonly paymentService: PaymentService) {}

  async handlePagbankWebhookPayments(body: any) {
    const { charges } = body as { charges: PagbankChargeDto[] };
    if (!charges || charges.length === 0) {
      return;
    }
    //prioridade absoluta: PAID
    const paidCharge = charges.find((c) => c.status === 'PAID');
    const selectedCharge = paidCharge
      ? paidCharge
      : charges
          .slice()
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )[0];
    if (!selectedCharge) {
      return;
    }
    const referenceId = selectedCharge.reference_id;
    const status = this.mapStatus(selectedCharge.status);
    const method = this.mapMethod(selectedCharge.payment_method?.type);
    const payload = selectedCharge.payment_method;

    await this.paymentService.updatePaymentWebhook(
      referenceId,
      status,
      method,
      payload,
    );
  }

  async handlePagbankWebhookCheckouts(body: any) {
    const status = await this.mapStatusCheckout(body.status);
    const referenceId = body.id;

    return this.paymentService.updatePaymentCheckoutWebhook(
      referenceId,
      status,
    );
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

  private async mapStatusCheckout(status: string): Promise<CheckoutStatus> {
    switch (status) {
      case 'ACTIVE':
        return CheckoutStatus.ACTIVE;
      case 'EXPIRED':
        return CheckoutStatus.EXPIRED;
      case 'INACTIVE':
        return CheckoutStatus.INACTIVE;
      default:
        return CheckoutStatus.INACTIVE;
    }
  }

  private mapStatus(status: string): PaymentStatus {
    switch (status) {
      case 'PAID':
        return PaymentStatus.PAID;
      case 'IN_ANALYSIS':
        return PaymentStatus.IN_ANALYSIS;
      case 'DECLINED':
        return PaymentStatus.DECLINED;
      case 'CANCELED':
        return PaymentStatus.CANCELED;
      case 'REFUNDED':
        return PaymentStatus.REFUNDED;
      default:
        return PaymentStatus.WAITING;
    }
  }
}
