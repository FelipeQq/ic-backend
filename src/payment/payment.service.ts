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

  //Cria o checkout de pagamento
  async createCheckout(dto: CreatePaymentCheckoutDto) {
    const { userId, eventId, roleRegistrationId } = dto;

    // Verifica se a inscrição existe
    const payments = await this.prisma.payment.findMany({
      where: {
        userId,
        eventId,
        roleRegistrationId: {
          in: roleRegistrationId,
        },
      },
    });

    if (payments.length === 0) {
      throw new NotFoundException('No registrations found for payment');
    }
    if (payments.some((p) => p.status === PaymentStatus.PAID)) {
      throw new BadRequestException('Some registrations are already paid');
    }
    const tickets = await this.prisma.rolesRegistration.findMany({
      where: {
        id: {
          in: roleRegistrationId,
        },
      },
    });
    if (tickets.length !== roleRegistrationId.length) {
      throw new NotFoundException('Some role registrations not found');
    }
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    //------------------------ data ------------------------------------------
    const data: CreatePagbankCheckoutDto = {
      reference_id: randomUUID(),
      items: tickets.map((ticket) => ({
        reference_id: ticket.id,
        description: ticket.description,
        name: 'Ingresso ' + event.name,
        quantity: 1,
        unit_amount: ticket.price, // em centavos
      })),
      payment_methods: [
        { type: 'credit_card', brands: ['mastercard'] },
        { type: 'credit_card', brands: ['visa'] },
        { type: 'debit_card', brands: ['visa'] },
        { type: 'PIX' },
        { type: 'BOLETO' },
      ],
      //webhooks
      payment_notification_urls: ['https://pagseguro.uol.com.br'],
      notification_urls: ['https://pagseguro.uol.com.br'],
      //urls de redirecionamento
      redirect_url: 'https://pagseguro.uol.com.br',
      return_url: 'https://pagseguro.uol.com.br',

      expiration_date: '2023-08-14T19:09:10-03:00',
      customer_modifiable: true,
      additional_amount: 0,
      discount_amount: 0,
    };
    //------------------------ fim data ------------------------------------------

    const result = await this.pagbankService.createCheckout(data);
    if (result.error) {
      throw new BadRequestException('Error creating checkout in PagBank');
    }

    //persisitr  no banco o checkout
    await this.prisma.paymentCheckout.create({
      data: {
        paymentId: payments[0].id,
        checkoutId: result.id,
        status: CheckoutStatus.CREATED,
        amount: tickets.reduce((sum, ticket) => sum + ticket.price, 0),
      },
    });
    return result;
  }
  async updatePayment(
    checkoutId: string,
    status: PaymentStatus,
    method: PaymentMethod,
    payload: any,
  ) {
    const payment = await this.prisma.paymentCheckout.findUnique({
      where: { checkoutId },
      include: { payment: true },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    // marcar como recebido
    await this.prisma.payment.update({
      where: { id: payment.payment.id },
      data: {
        method,
        status,
        payload,
      },
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

  async updatePaymentCheckoutStatus(
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
