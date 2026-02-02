import {
  BadRequestException,
  Injectable,
  Logger,
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
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { uploadImageFirebase } from 'src/utils/uploadImgFirebase';
@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagbankService: PagbankService,
  ) {}

  private readonly logger = new Logger(PaymentService.name);

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

  async createCheckout(dto: CreatePaymentCheckoutDto) {
    const { userId, eventId, roleRegistrationId } = dto;

    try {
      // ============================
      // FASE 1 — Somente leitura e preparação (SEM TRANSACTION)
      // ============================

      // Verifica se há registros
      if (roleRegistrationId.length === 0) {
        throw new BadRequestException('No role registrations provided');
      }

      // Busca evento
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
      });
      if (!event) throw new NotFoundException('Event not found');

      // Busca usuário
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      // Busca pagamentos
      const payments = await this.prisma.payment.findMany({
        where: {
          userId,
          eventId,
          roleRegistrationId: { in: roleRegistrationId },
        },
        include: {
          checkouts: true,
          eventUserRole: { select: { role: true, discount: true } },
        },
      });

      if (!payments.length) {
        throw new NotFoundException('No registrations found for payment');
      }

      const unpaidPayments = payments.filter(
        (p) => p.status !== PaymentStatus.PAID,
      );

      if (!unpaidPayments.length) {
        throw new BadRequestException(
          'Alguns itens possuem pagamentos em andamento. Por favor, atualize a página.',
        );
      }

      const activeCheckouts = unpaidPayments
        .flatMap((p) => p.checkouts)
        .filter((c) => c.status === CheckoutStatus.ACTIVE);

      // se o pagamento tiver checkouts criados e ativos deve ferificar se eles estão ativos na api também
      //caso algum checkout tive status difererente de awainting na api, deve atualizar o status no banco e cancelalr a operação
      if (activeCheckouts.length > 0) {
        for (const checkout of activeCheckouts) {
          try {
            const response = await this.pagbankService.getPaymentStatus(
              checkout.referenceId,
            );
            const chargeMaisRecente = response.reduce((atual, item) => {
              return new Date(item.created_at) > new Date(atual.created_at)
                ? item
                : atual;
            });

            const pagbankStatus = chargeMaisRecente.status as PaymentStatus;
            const method = chargeMaisRecente.payment_method
              .type as PaymentMethod;
            const payload = chargeMaisRecente;

            if (pagbankStatus !== PaymentStatus.WAITING) {
              //atualiza no banco
              await this.prisma.paymentCheckout.updateMany({
                where: { checkoutId: checkout.checkoutId },
                data: { status: CheckoutStatus.INACTIVE },
              });
              await this.prisma.payment.updateMany({
                where: { id: checkout.paymentId },
                data: { status: pagbankStatus, method, payload },
              });
              throw new BadRequestException(
                `Alguns itens possuem pagamentos em andamento. Por favor, atualize a página.`,
              );
            }
          } catch (error) {
            if (
              error.status === 404 &&
              error.response?.error_messages[0].code === 'resource_not_found'
            ) {
              // mesmo com checkout ativo, nenhuma ordem foi criada na pagbank, então pode prosseguir
              continue;
            }
            this.logger.error(
              `Erro ao verificar status do pagamento na PagBank para referenceId ${checkout.referenceId}:`,
              error,
            );
            throw error;
          }
        }
      }

      // ---------- regra de reutilização ----------
      const allHaveActive = unpaidPayments.every((p) =>
        p.checkouts?.some((c) => c.status === CheckoutStatus.ACTIVE),
      );

      let reuseCheckout = false;
      let reuseLink = '';

      // Reutilização de checkout
      if (allHaveActive && activeCheckouts.length > 0) {
        const uniqueIds = new Set(activeCheckouts.map((c) => c.checkoutId));

        if (uniqueIds.size === 1) {
          const checkoutId = [...uniqueIds][0];

          const usedByOthers = await this.prisma.paymentCheckout.findMany({
            where: {
              checkoutId,
              status: CheckoutStatus.ACTIVE,
              payment: {
                NOT: { id: { in: unpaidPayments.map((p) => p.id) } },
              },
            },
          });

          // Verifica se esse checkout já está a mais de 1h aberto
          const checkoutCreatedAt = activeCheckouts[0].createdAt || new Date();
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

          if (usedByOthers.length === 0 && checkoutCreatedAt > oneHourAgo) {
            // Atualiza pagamentos para WAITING
            await this.prisma.payment.updateMany({
              where: {
                id: { in: unpaidPayments.map((p) => p.id) },
              },
              data: {
                status: PaymentStatus.WAITING,
                method: PaymentMethod.OTHER,
              },
            });

            reuseCheckout = true;
            reuseLink = activeCheckouts[0].link;
          }
        }
      }

      // ============================
      // Reutilização imediata
      // ============================
      if (reuseCheckout) {
        return {
          message: 'Checkout already exists',
          link: reuseLink,
        };
      }

      // ---------- prepara dados para novo checkout ----------
      const tickets = unpaidPayments.map((p) => {
        const role = p.eventUserRole?.role;
        return {
          id: role?.id ?? 'unknown',
          description: role?.description ?? 'Ingresso',
          price: role?.price ?? 0,
        };
      });

      // Calcula desconto
      const totalDiscount = unpaidPayments.reduce((acc, payment) => {
        const discount = payment.eventUserRole?.discount;
        if (discount) {
          return (
            acc +
            discount.percentage * (payment.eventUserRole?.role?.price || 0)
          );
        }
        return acc;
      }, 0);

      if (!tickets.length) {
        throw new BadRequestException('No tickets found for payment');
      }

      const { ddd, numero } = this.extrairDddENumero(user.cellphone);
      const dateExpiration = new Date(Date.now() + 1 * 60 * 60 * 1000); //1h
      const payload: CreatePagbankCheckoutDto = {
        reference_id: randomUUID(),
        soft_descriptor: 'Igreja de cristo',
        expiration_date: dateExpiration.toISOString(),
        payment_notification_urls: [
          `${process.env.URL_BACKEND}/webhooks/pagbank/payments`,
        ],
        notification_urls: [
          `${process.env.URL_BACKEND}/webhooks/pagbank/checkouts`,
        ],
        redirect_url: `${process.env.URL_FRONTEND}/events/${eventId}`,
        return_url: `${process.env.URL_FRONTEND}/events/${eventId}`,
        customer_modifiable: false,
        customer: {
          name: user.fullName,
          email: user.email,
          tax_id: user.cpf,
          phone: { country: '55', area: ddd, number: numero },
        },
        discount_amount: totalDiscount * 100,
        items: tickets
          .filter((t) => t.price > 0)
          .map((t) => ({
            reference_id: t.id,
            description: t.description,
            name: `Ingresso ${event.name} - ${t.description}`,
            quantity: 1,
            unit_amount: t.price * 100,
          })),
        payment_methods: [
          { type: 'CREDIT_CARD' },
          { type: 'DEBIT_CARD' },
          { type: 'BOLETO' },
          { type: 'PIX' },
        ],
      };

      const checkoutIdsToInvalidate = [
        ...new Set(activeCheckouts.map((c) => c.checkoutId)),
      ];

      // ============================
      // FASE 2 — Chamada externa (fora da transaction)
      // ============================
      const result = await this.pagbankService.createCheckout(payload);

      if (result?.error) {
        throw new BadRequestException('Error creating checkout in PagBank');
      }

      const linkPay =
        result.links.find((l: any) => l.rel === 'PAY')?.href ?? '';

      // Invalidar checkouts antigos na api (assíncrono)
      for (const checkoutId of checkoutIdsToInvalidate) {
        this.pagbankService.inactivateCheckout(checkoutId).catch((err) => {
          this.logger.error(
            `Erro ao inativar checkout ${checkoutId} na PagBank:`,
            JSON.stringify(err),
          );
        });
      }

      // ============================
      // FASE 3 — Agora sim: grava tudo de uma vez (COM TRANSACTION MANTIDA)
      // ============================
      await this.prisma.$transaction(
        async (tx) => {
          // 1. Inativa todos os checkouts antigos envolvidos
          if (checkoutIdsToInvalidate.length > 0) {
            await tx.paymentCheckout.updateMany({
              where: {
                checkoutId: { in: checkoutIdsToInvalidate },
                status: CheckoutStatus.ACTIVE,
              },
              data: { status: CheckoutStatus.INACTIVE },
            });
          }

          // 2. Cria os novos vínculos
          await tx.paymentCheckout.createMany({
            data: unpaidPayments.map((payment) => ({
              paymentId: payment.id,
              checkoutId: result.id,
              link: linkPay,
              referenceId: payload.reference_id,
              status: CheckoutStatus.ACTIVE,
              amount: tickets.reduce((sum, t) => sum + t.price, 0),
            })),
          });

          // 3. Mudar os status dos pagamentos para WAITING
          await tx.payment.updateMany({
            where: {
              id: { in: unpaidPayments.map((p) => p.id) },
            },
            data: {
              status: PaymentStatus.WAITING,
              method: PaymentMethod.OTHER,
            },
          });
        },
        {
          timeout: 20000, // 20 segundos
          maxWait: 5000, // tempo máximo esperando conexão
        },
      );

      return {
        message: 'checkout created',
        link: linkPay,
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async updatePaymentWebhook(
    referenceId: string,
    status: PaymentStatus,
    method: PaymentMethod,
    payload: any,
  ) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const paymentCheckout = await tx.paymentCheckout.findMany({
          where: { referenceId },
          include: { payment: true },
        });
        if (!paymentCheckout || paymentCheckout.length === 0) {
          throw new NotFoundException('Payment not found');
        }
        if (paymentCheckout[0].payment.status === PaymentStatus.PAID) {
          return; // idempotência
        }
        // marcar como recebido
        await this.prisma.payment.updateMany({
          where: { id: { in: paymentCheckout.map((pc) => pc.payment.id) } },
          data: {
            method,
            status,
            payload,
          },
        });
        // inativar checkouts
        await this.prisma.paymentCheckout.updateMany({
          where: { referenceId },
          data: { status: CheckoutStatus.INACTIVE },
        });
      });
      return { message: 'Webhook de pagamento atualizado com sucesso' };
    } catch (error) {
      console.log('Erro ao atualizar webhook de pagamento:', error);
    }
  }
  async updatePaymentCheckoutWebhook(
    checkoutId: string,
    status: CheckoutStatus,
  ) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const paymentCheckout = await tx.paymentCheckout.findMany({
          where: { checkoutId },
        });
        if (!paymentCheckout || paymentCheckout.length === 0) {
          throw new NotFoundException('Payment checkout not found');
        }
        await tx.paymentCheckout.updateMany({
          where: { checkoutId },
          data: { status },
        });
      });
      return { message: 'Webhook de checkout atualizado com sucesso' };
    } catch (error) {
      console.log('Erro ao atualizar webhook de checkout:', error);
    }
  }

  async updatePaymentStatus(payload: UpdatePaymentStatusDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: payload.paymentId },
      include: {
        eventUserRole: {
          include: {
            eventOnUsers: {
              include: { event: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (
      payment.status === PaymentStatus.PAID &&
      payload.status !== PaymentStatus.REFUNDED
    ) {
      throw new BadRequestException(
        'Não é possível alterar um pagamento já pago, exceto para reembolso',
      );
    }
    let eventId = payment.eventUserRole?.eventOnUsers?.event?.id;
    let url: string | undefined;
    if (payload.receiptFile) {
      url = (
        await uploadImageFirebase(
          payload.receiptFile,
          `events/${eventId}/payments/receipt-${
            payload.paymentId
          }-${Date.now()}`,
        )
      ).url;
    }

    await this.prisma.payment.update({
      where: { id: payload.paymentId },
      data: {
        status: payload.status,
        method: payload.method,
        receivedFrom: PaymentReceived.EXTERNAL,
        ...(payload.discountsAppliedId && {
          eventUserRole: {
            update: {
              discountId: payload?.discountsAppliedId || null,
            },
          },
        }),
        payload: {
          ...(typeof payment.payload === 'object' && payment.payload !== null
            ? payment.payload
            : {}),
          comprovanteFileUrl: url,
        },
      },
    });
    // ivalidar os checkouts que contem esse pagamento em todos os pagamentos relacionados
    await this.prisma.$transaction(async (tx) => {
      const activeCheckouts = await tx.paymentCheckout.findMany({
        where: {
          paymentId: payload.paymentId,
          status: CheckoutStatus.ACTIVE,
        },
      });

      const checkoutIdsToInvalidate = [
        ...new Set(activeCheckouts.map((c) => c.checkoutId)),
      ];

      if (checkoutIdsToInvalidate.length > 0) {
        await tx.paymentCheckout.updateMany({
          where: {
            checkoutId: { in: checkoutIdsToInvalidate },
            status: CheckoutStatus.ACTIVE,
          },
          data: { status: CheckoutStatus.INACTIVE },
        });
      }
    });

    // await this.prisma.paymentCheckout.updateMany({
    //   where: {
    //     paymentId: payload.paymentId,
    //     status: CheckoutStatus.ACTIVE,
    //   },
    //   data: { status: CheckoutStatus.INACTIVE },
    // });
  }

  async findPaymentsByEvent(eventId?: string, userId?: string) {
    return this.prisma.eventOnUsers
      .findMany({
        where: {
          ...(eventId && { eventId }),
          ...(userId && { userId }),
        },
        include: {
          rolesRegistration: {
            select: {
              discount: { select: { id: true } },
              payment: true,
              role: {
                select: { groupId: true, group: { select: { name: true } } },
              },
            },
          },

          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              cpf: true,
            },
          }, // se não tiver eventid, traz os dados do evento tb
          event: eventId
            ? false
            : {
                select: {
                  id: true,
                  name: true,
                  data: true,
                },
              },
        },
      })
      .then((eventOnUsers) => {
        return eventOnUsers.flatMap((eou) =>
          eou.rolesRegistration
            .filter((rr) => rr.payment) // evita null
            .map((rr) => ({
              ...eou.user,
              ...rr.payment, // cada pagamento vira um item separado
              groupId: rr.role?.groupId,
              groupName: rr.role?.group?.name,
              discountsAppliedId: rr.discount?.id,
            })),
        );
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
                event: true,
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
  async findUserEventsWithRoles(userId: string) {
    const events = await this.prisma.event.findMany({
      where: {
        OR: [
          {
            users: {
              some: {
                userId,
                rolesRegistration: { some: {} },
              },
            },
          },
          {
            waitlist: {
              some: {
                userId,
                roleRegistrationId: { not: null },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        data: true,

        users: {
          where: { userId },
          select: {
            rolesRegistration: {
              select: {
                role: {
                  select: {
                    id: true,
                    description: true,
                    price: true,
                    group: { select: { name: true } },
                  },
                },
                payment: {
                  select: {
                    status: true,
                    method: true,
                  },
                },
              },
            },
          },
        },

        waitlist: {
          where: {
            userId,
            roleRegistrationId: { not: null },
          },
          select: {
            rolesRegistration: {
              select: {
                id: true,
                description: true,
                price: true,
                group: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    return events.map((event) => ({
      eventId: event.id,
      eventName: event.name,
      data: event.data,

      registeredRoles: event.users.flatMap((u) =>
        u.rolesRegistration.map((r) => ({
          roleId: r.role.id,
          description: r.role.description,
          group: r.role.group.name,
          price: r.role.price,
          paymentStatus: r.payment?.status ?? 'WAITING',
          paymentMethod: r.payment?.method ?? null,
        })),
      ),

      waitlistRoles: event.waitlist.map((w) => ({
        roleId: w.rolesRegistration!.id,
        description: w.rolesRegistration!.description,
        group: w.rolesRegistration!.group.name,
        price: w.rolesRegistration!.price,
      })),
    }));
  }

  //gambis
  async getDiscounts() {
    const data = await this.prisma.discounts.findMany();
    return data.map((d) => ({
      id: d.id,
      description: d.description,
      percentage: d.percentage,
    }));
  }
}
