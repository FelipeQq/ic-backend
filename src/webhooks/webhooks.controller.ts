import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { PagbankChargeDto } from './dto/webhook-pagbank-payments.dto';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @ApiOperation({ summary: 'Webhook PagBank Checkouts' })
  @Post('/pagbank/checkouts')
  async handlePagbank(@Body() payload: any) {
    return this.webhooksService.handlePagbankWebhookCheckouts(payload);
  }

  @ApiOperation({ summary: 'Webhook PagBank Payments' })
  @Post('/pagbank/payments')
  async handlePagbankPayments(@Body() payload: any) {
    const { charges } = payload as { charges: PagbankChargeDto[] };
    return this.webhooksService.handlePagbankWebhookPayments(charges);
  }
}
