import { ApiProperty } from '@nestjs/swagger';
import { PagbankCustomerDto } from './pagbank-customer.dto';
import { PagbankShippingDto } from './pagbank-shipping.dto';
import { PagbankPaymentMethodDto } from './pagbank-payment-method.dto';
import { PagbankPaymentMethodConfigDto } from './pagbank-payment-method-config.dto';
import { PagbankItemDto } from './pagbank-item.dto';

export class CreatePagbankCheckoutDto {
  @ApiProperty({ example: 'payment-uuid-ref' })
  reference_id: string;

  @ApiProperty({
    example: '2025-12-31T23:59:59-03:00',
    required: false,
  })
  expiration_date?: string;

  @ApiProperty({ example: false, default: false })
  customer_modifiable?: boolean;

  @ApiProperty({ type: PagbankCustomerDto, required: false })
  customer?: PagbankCustomerDto;

  @ApiProperty({ type: [PagbankItemDto] })
  items: PagbankItemDto[];

  @ApiProperty({
    example: 500,
    description: 'Valor adicional em centavos',
    required: false,
  })
  additional_amount?: number;

  @ApiProperty({
    example: 200,
    description: 'Valor de desconto em centavos',
    required: false,
  })
  discount_amount?: number;

  @ApiProperty({ type: PagbankShippingDto, required: false })
  shipping?: PagbankShippingDto;

  @ApiProperty({
    type: [PagbankPaymentMethodDto],
    required: false,
  })
  payment_methods?: PagbankPaymentMethodDto[];

  @ApiProperty({
    type: [PagbankPaymentMethodConfigDto],
    required: false,
  })
  payment_method_configs?: PagbankPaymentMethodConfigDto[];

  @ApiProperty({ example: 'https://app.com/success', required: false })
  redirect_url?: string;

  @ApiProperty({ example: 'https://app.com/return', required: false })
  return_url?: string;

  @ApiProperty({
    example: ['https://api.app.com/webhooks/pagbank'],
    required: false,
  })
  notification_urls?: string[];

  @ApiProperty({
    example: ['https://api.app.com/webhooks/pagbank/payment'],
    required: false,
  })
  payment_notification_urls?: string[];

  @ApiProperty({
    example: 'EVENTOXYZ',
    required: false,
    description: 'Texto exibido na fatura do cartão',
  })
  soft_descriptor?: string;
}
