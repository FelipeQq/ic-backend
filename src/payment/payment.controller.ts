import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/decorators/auth.guard';
import {
  CreatePaymentCheckoutDto,
  payloadCreatePaymentCheckoutDto,
} from './dto/create-payment-checkout.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

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
  @Post('events/:idEvent/users/:idUser/payments')
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
  findByUserEvent(
    @Param('idEvent') eventId: string,
    @Param('idUser') userId: string,
  ) {
    return this.paymentService.findPaymentsByUser(userId, eventId);
  }

  @ApiOperation({ summary: 'Get payments by user' })
  @Get('users/:idUser/payments')
  findByUser(@Param('idUser') userId: string) {
    return this.paymentService.findUserEventsWithRoles(userId);
  }

  // ===============================
  // Atualizar status do pagamento
  // ===============================

  @ApiOperation({ summary: 'Update payment' })
  @Put('payments/:paymentId')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'receiptFile', maxCount: 1 }]),
  )
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('paymentId') paymentId: string,
    @UploadedFiles()
    files: {
      receiptFile?: Express.Multer.File[];
    },
    @Body() body: UpdatePaymentStatusDto,
  ) {
    const receiptFile = files.receiptFile?.[0];
    body.receiptFile = receiptFile;
    body.paymentId = paymentId;
    return this.paymentService.updatePaymentStatus(body);
  }

  // ===============================
  // Reembolso
  // ===============================
  @ApiOperation({ summary: 'Refund payment' })
  @Patch('payments/:paymentId/refund')
  refund(@Param('paymentId') paymentId: string) {
    return this.paymentService.refundPayment(paymentId);
  }

  // ===============================
  // Gambis
  // ===============================
  @ApiOperation({ summary: 'Get discounts' })
  @Get('discounts')
  getDiscounts() {
    return this.paymentService.getDiscounts();
  }
}
