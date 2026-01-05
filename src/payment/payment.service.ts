import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentReceived, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  // ===============================
  // Criar pagamento
  // ===============================
  async createPayment(dto: CreatePaymentDto) {
    const {
      userId,
      eventId,
      roleRegistrationId,
      amount,
      method,
      receivedFrom,
    } = dto;

    // Verifica se a inscrição existe
    const eventUserRole =
      await this.prisma.eventOnUsersRolesRegistration.findUnique({
        where: {
          userId_eventId_roleRegistrationId: {
            userId,
            eventId,
            roleRegistrationId,
          },
        },
      });

    if (!eventUserRole) {
      throw new NotFoundException(
        'User is not registered in this event with this role',
      );
    }

    // Verifica se já existe pagamento
    const existingPayment = await this.prisma.payment.findUnique({
      where: {
        eventUserRoleUserId_eventUserRoleEventId_eventUserRoleRoleRegistrationId:
          {
            eventUserRoleUserId: userId,
            eventUserRoleEventId: eventId,
            eventUserRoleRoleRegistrationId: roleRegistrationId,
          },
      },
    });

    if (existingPayment) {
      throw new BadRequestException('Payment already exists');
    }

    return this.prisma.payment.create({
      data: {
        method,
        amount,
        status: PaymentStatus.PENDING,
        receivedFrom: receivedFrom ?? PaymentReceived.SYSTEM,
        eventUserRole: {
          connect: {
            userId_eventId_roleRegistrationId: {
              userId,
              eventId,
              roleRegistrationId,
            },
          },
        },
      },
    });
  }

  // ===============================
  // Atualizar status do pagamento
  // ===============================
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

  // ===============================
  // Buscar pagamentos por evento
  // ===============================
  async findPaymentsByEvent(eventId: string) {
    return this.prisma.payment.findMany({
      where: {
        eventUserRoleEventId: eventId,
      },
      include: {
        eventUserRole: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  // ===============================
  // Buscar pagamentos por usuário
  // ===============================
  async findPaymentsByUser(userId: string) {
    return this.prisma.payment.findMany({
      where: {
        eventUserRoleUserId: userId,
      },
      include: {
        eventUserRole: {
          include: {
            role: true,
            eventOnUsers: {
              include: {
                event: true,
              },
            },
          },
        },
      },
    });
  }

  // ===============================
  // Cancelar / Reembolsar pagamento
  // ===============================
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
