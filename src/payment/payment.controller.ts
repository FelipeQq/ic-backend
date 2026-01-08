import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/decorators/auth.guard';
import {
  CreatePaymentCheckoutDto,
  payloadCreatePaymentCheckoutDto,
} from './dto/create-payment-checkout.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ===============================
  // Criar pagamento (usuário no evento)
  // ===============================
  @ApiOperation({ summary: 'Create payment checkout for user in event' })
  @Post('events/:idEvent/users/:idUser')
  create(
    @Param('idEvent') eventId: string,
    @Param('idUser') userId: string,
    @Body() body: payloadCreatePaymentCheckoutDto,
  ) {
    return this.paymentService.createCheckout({
      userId,
      eventId,
      roleRegistrationId: body.roleRegistrationId,
    });
  }

  // ===============================
  // Pagamentos por evento
  // ===============================
  @ApiOperation({ summary: 'Get payments by event' })
  @Get('events/:idEvent/payments')
  findByEvent(@Param('idEvent') eventId: string) {
    return this.paymentService.findPaymentsByEvent(eventId);
  }

  // ===============================
  // Pagamentos por usuário no evento
  // ===============================
  @ApiOperation({ summary: 'Get payments by user in event' })
  @Get('events/:idEvent/users/:idUser/payments')
  findByUser(
    @Param('idEvent') eventId: string,
    @Param('idUser') userId: string,
  ) {
    return this.paymentService.findPaymentsByUser(userId);
  }

  // ===============================
  // Atualizar status do pagamento
  // ===============================
  @ApiOperation({ summary: 'Update payment status' })
  @Put('payments/:paymentId')
  updateStatus(
    @Param('paymentId') paymentId: string,
    @Body() body: UpdatePaymentStatusDto,
  ) {
    return this.paymentService.updatePaymentStatus(paymentId, body.status);
  }

  // ===============================
  // Reembolso
  // ===============================
  @ApiOperation({ summary: 'Refund payment' })
  @Patch('payments/:paymentId/refund')
  refund(@Param('paymentId') paymentId: string) {
    return this.paymentService.refundPayment(paymentId);
  }
}
