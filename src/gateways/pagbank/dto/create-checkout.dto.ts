import { ApiProperty } from '@nestjs/swagger';
import { PagbankCustomerDto } from './pagbank-customer.dto';

export class CreatePagbankCheckoutDto {
  @ApiProperty({ example: 'payment-uuid-ref' })
  referenceId: string;

  @ApiProperty({ example: 'Inscrição Evento XYZ' })
  description: string;

  @ApiProperty({ example: 15000, description: 'Valor em centavos' })
  amount: number;

  @ApiProperty({ type: PagbankCustomerDto })
  customer: PagbankCustomerDto;

  @ApiProperty({ example: 'https://app.com/success' })
  successUrl: string;

  @ApiProperty({ example: 'https://app.com/cancel' })
  cancelUrl: string;

  @ApiProperty({ example: 'https://api.app.com/webhooks/pagbank' })
  webhookUrl: string;
}
