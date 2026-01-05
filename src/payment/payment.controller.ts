import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus } from '@prisma/client';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ===============================
  // Criar pagamento
  // ===============================
  @Post()
  async create(@Body() dto: CreatePaymentDto) {
    return this.paymentService.createPayment(dto);
  }

  // ===============================
  // Atualizar status do pagamento
  // ===============================
  @Patch(':id/status/:status')
  async updateStatus(
    @Param('id') paymentId: string,
    @Param('status') status: PaymentStatus,
  ) {
    return this.paymentService.updatePaymentStatus(paymentId, status);
  }

  // ===============================
  // Pagamentos por evento
  // ===============================
  @Get('event/:eventId')
  async findByEvent(@Param('eventId') eventId: string) {
    return this.paymentService.findPaymentsByEvent(eventId);
  }

  // ===============================
  // Pagamentos por usuário
  // ===============================
  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.paymentService.findPaymentsByUser(userId);
  }

  // ===============================
  // Reembolso
  // ===============================
  @Patch(':id/refund')
  async refund(@Param('id') paymentId: string) {
    return this.paymentService.refundPayment(paymentId);
  }
}
