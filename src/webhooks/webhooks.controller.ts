import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @ApiOperation({ summary: 'Webhook PagBank' })
  @Post('pagbank/notifications')
  async handlePagbank(@Body() payload: any) {
    return this.webhooksService.handlePagbankWebhook(payload);
  }
}
