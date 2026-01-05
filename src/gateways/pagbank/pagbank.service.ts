import { Injectable } from '@nestjs/common';
import { CreatePagbankCheckoutDto } from './dto/create-checkout.dto';
import { PagbankClient } from './pagbank.client';

@Injectable()
export class PagbankService {
  private readonly client = new PagbankClient();

  async createCheckout(dto: CreatePagbankCheckoutDto) {
    const { data } = await this.client.sdk.criarCheckout(
      this.client.authHeader,
      {
        reference_id: dto.referenceId,
        items: [
          {
            name: dto.description,
            quantity: 1,
            unit_amount: dto.amount,
          },
        ],
        customer: dto.customer,
        redirect_urls: {
          success: dto.successUrl,
          cancel: dto.cancelUrl,
        },
        notification_urls: [dto.webhookUrl],
      },
    );

    const checkoutUrl = data?.links?.find(
      (link: any) => link.rel === 'checkout',
    )?.href;

    return {
      checkoutUrl,
      raw: data,
    };
  }
}
