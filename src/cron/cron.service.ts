import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CheckoutStatus, PaymentStatus, PrismaClient } from '@prisma/client';
import axios from 'axios';
import { PagbankService } from 'src/gateways/pagbank/pagbank.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private prisma = new PrismaClient();

  constructor(private readonly pagbankService: PagbankService) {}

  private PAGBANK_TOKEN = process.env.PAGBANK_TOKEN;

  @Cron(CronExpression.EVERY_5_MINUTES)
  async reconcilePayments() {
    this.logger.log('⏳ Iniciando reconciliação de pagamentos...');
    // 1. Busca todos os pagamentos pendentes ou em analise no banco
    const pendentes = await this.prisma.payment.findMany({
      where: {
        status: { in: [PaymentStatus.WAITING, PaymentStatus.IN_ANALYSIS] },
        checkouts: { some: {} },
      },
      select: {
        checkouts: {
          orderBy: { createdAt: 'desc' }, // ou created_at dependendo do seu schema
          take: 1,
          select: { referenceId: true },
        },
      },
    });

    const referenceIds = pendentes
      .map((p) => p.checkouts.map((c) => c.referenceId))
      .flat();

    this.logger.log(`Encontrados ${pendentes.length} pagamentos pendentes`);

    // 2. Para cada pagamento, consulta o PagBank
    for (const referenceId of referenceIds) {
      try {
        const response = await this.pagbankService.getPaymentStatus(
          referenceId,
        );

        const chargeMaisRecente = response.reduce((atual, item) => {
          return new Date(item.created_at) > new Date(atual.created_at)
            ? item
            : atual;
        });

        const pagbankStatus = chargeMaisRecente.status as PaymentStatus;

        // Só prossegue se o status for diferente do que está no banco
        const pagamentoNoBanco = await this.prisma.payment.findFirst({
          where: {
            checkouts: { some: { referenceId } },
          },
        });

        if (!pagamentoNoBanco) {
          this.logger.warn(
            `Pagamento com referenceId ${referenceId} não encontrado no banco.`,
          );
          continue;
        }

        if (pagamentoNoBanco.status === pagbankStatus) {
          this.logger.log(
            `Pagamento ${referenceId} já está com status ${pagbankStatus}, pulando...`,
          );
          continue;
        }

        // 3. Atualiza o status no banco em payments e checkouts
        await this.prisma.$transaction(async (tx) => {
          await tx.payment.updateMany({
            where: {
              checkouts: {
                some: { referenceId },
              },
            },
            data: {
              status: pagbankStatus,
            },
          });
          if (pagbankStatus === PaymentStatus.PAID) {
            await tx.paymentCheckout.updateMany({
              where: { referenceId },
              data: {
                status: CheckoutStatus.INACTIVE,
              },
            });
          }
        });
        this.logger.log(
          `Pagamento ${referenceId} atualizado para ${pagbankStatus}`,
        );
      } catch (error) {
        if (error.response && error.status === 404) {
          this.logger.warn(
            `Pagamento ${referenceId} não encontrado no PagBank.`,
          );
          continue;
        }
        this.logger.error(
          `Erro ao consultar PagBank para referenceId ${referenceId}: ${error.message}`,
        );
        continue;
      }
    }

    this.logger.log('✅ Reconciliação finalizada');
  }
}
