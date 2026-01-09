import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  CheckoutStatus,
  PaymentMethod,
  PaymentReceived,
  PaymentStatus,
} from '@prisma/client';
import { CreatePaymentCheckoutDto } from './dto/create-payment-checkout.dto';
import { CreatePagbankCheckoutDto } from 'src/gateways/pagbank/dto/create-checkout.dto';
import { PagbankService } from 'src/gateways/pagbank/pagbank.service';
import { randomUUID } from 'crypto';
@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagbankService: PagbankService,
  ) {}

  private extrairDddENumero(telefone: string) {
    // Remove tudo que não for número
    const numeros = telefone.replace(/\D/g, '');

    // Remove código do país (55) se existir
    const numeroLimpo = numeros.startsWith('55') ? numeros.slice(2) : numeros;

    if (numeroLimpo.length < 10) {
      throw new Error('Número de telefone inválido');
    }

    const ddd = numeroLimpo.slice(0, 2);
    const numero = numeroLimpo.slice(2);

    return {
      ddd,
      numero,
    };
  }

  //Cria o checkout de pagamento
  async createCheckout(dto: CreatePaymentCheckoutDto) {
    const transaction = await this.prisma.$transaction(async (tx) => {
      const { userId, eventId, roleRegistrationId } = dto;

      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const payments = await tx.payment.findMany({
        where: {
          userId,
          eventId,
          roleRegistrationId: {
            in: roleRegistrationId,
          },
        },
        include: {
          checkouts: true,
        },
      });

      if (payments.length === 0) {
        throw new NotFoundException('No registrations found for payment');
      }

      const unpaidPayments = payments.filter(
        (p) => p.status !== PaymentStatus.PAID,
      );

      if (unpaidPayments.length === 0) {
        throw new BadRequestException('Some registrations are already paid');
      }

      //  checkouts ativos
      const activeCheckouts = unpaidPayments
        .flatMap((p) => p.checkouts)
        .filter((c) => c.status === CheckoutStatus.CREATED);

      //  se existir apenas UM checkout ativo e único → reutiliza
      const uniqueCheckoutIds = new Set(
        activeCheckouts.map((c) => c.checkoutId),
      );

      if (uniqueCheckoutIds.size === 1 && activeCheckouts.length > 0) {
        return {
          message: 'Checkout already exists',
          link: activeCheckouts[0].link,
        };
      }

      //  se existirem checkouts diferentes → cancelar todos
      if (activeCheckouts.length > 0) {
        await tx.paymentCheckout.updateMany({
          where: {
            id: { in: activeCheckouts.map((c) => c.id) },
          },
          data: { status: CheckoutStatus.CANCELED },
        });
      }
      //Obs: é bom intivar tb a API do PagBank para cancelar o checkout lá, mas eles vão expirar sozinhos em 2h

      // ---------------- tickets ----------------
      const tickets = await tx.rolesRegistration.findMany({
        where: {
          id: { in: roleRegistrationId },
        },
      });

      if (tickets.length !== roleRegistrationId.length) {
        throw new NotFoundException('Some role registrations not found');
      }

      const event = await tx.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new NotFoundException('Event not found');
      }
      const { ddd, numero } = this.extrairDddENumero(user.cellphone);
      // ---------------- PagBank data ----------------
      const data: CreatePagbankCheckoutDto = {
        reference_id: randomUUID(),
        soft_descriptor: 'Igreja de cristo',
        payment_notification_urls: [
          `${process.env.URL_BACKEND}/webhooks/pagbank/payments`,
        ],
        notification_urls: [
          `${process.env.URL_BACKEND}/webhooks/pagbank/checkouts`,
        ],
        redirect_url: `${process.env.URL_FRONTEND}/events/${eventId}/checkout/success`,
        return_url: `${process.env.URL_FRONTEND}/events/${eventId}/checkout/return`,
        customer_modifiable: false,
        customer: {
          name: user.fullName,
          email: user.email,
          tax_id: user.cpf,
          phone: { country: '55', area: ddd, number: numero },
        },
        additional_amount: 0,
        discount_amount: 0,
        items: tickets.map((ticket) => ({
          reference_id: ticket?.id,
          description: ticket?.description,
          name: `Ingresso ${event?.name} - ${ticket?.description}`,
          quantity: 1,
          unit_amount: ticket?.price * 100,
        })),
        payment_methods: [
          { type: 'CREDIT_CARD' },
          { type: 'DEBIT_CARD' },
          { type: 'BOLETO' },
          { type: 'PIX' },
        ],
      };
      console.log('Reference ID:', data.reference_id);

      const result = await this.pagbankService.createCheckout(data);

      if (result.error) {
        throw new BadRequestException('Error creating checkout in PagBank');
      }

      const linkPay = result.links.find((l) => l.rel === 'PAY')?.href ?? '';

      // persiste o mesmo checkout para TODOS os pagamentos
      await tx.paymentCheckout.createMany({
        data: unpaidPayments.map((payment) => ({
          paymentId: payment.id,
          checkoutId: result.id,
          link: linkPay,
          status: CheckoutStatus.CREATED,
          amount: tickets.reduce((sum, t) => sum + t.price, 0),
        })),
      });

      return { message: 'checkout created', link: linkPay };
    });
    return transaction;
  }

  async updatePaymentWebhook(
    checkoutId: string,
    status: PaymentStatus,
    method: PaymentMethod,
    payload: any,
  ) {
    const paymentCheckout = await this.prisma.paymentCheckout.findUnique({
      where: { checkoutId },
      include: { payment: true },
    });
    if (!paymentCheckout) {
      throw new NotFoundException('Payment not found');
    }
    if (paymentCheckout.payment.status === PaymentStatus.PAID) {
      return; // idempotência
    }
    // marcar como recebido
    await this.prisma.payment.update({
      where: { id: paymentCheckout.payment.id },
      data: {
        method,
        status,
        payload,
      },
    });
  }
  async updatePaymentCheckoutWebhook(
    checkoutId: string,
    status: CheckoutStatus,
  ) {
    const paymentCheckout = await this.prisma.paymentCheckout.findUnique({
      where: { checkoutId },
    });
    if (!paymentCheckout) {
      throw new NotFoundException('Payment checkout not found');
    }
    return this.prisma.paymentCheckout.update({
      where: { checkoutId },
      data: { status },
    });
  }

  async updatePaymentStatus(paymentId: string, status: PaymentStatus) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status },
    });
  }

  async findPaymentsByEvent(eventId: string) {
    return this.prisma.payment.findMany({
      where: {
        eventId,
      },
      include: {
        checkouts: true,
        eventUserRole: {
          include: {
            role: true,
            eventOnUsers: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
  }

  async findPaymentsByUser(userId: string, eventId?: string) {
    return this.prisma.payment.findMany({
      where: {
        userId,
        ...(eventId && { eventId }),
      },
      include: {
        checkouts: true,
        eventUserRole: {
          include: {
            role: true,
            eventOnUsers: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
  }

  async refundPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Only PAID payments can be refunded');
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
      },
    });
  }
}
