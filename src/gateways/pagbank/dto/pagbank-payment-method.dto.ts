import { ApiProperty } from '@nestjs/swagger';

export class PagbankPaymentMethodDto {
  @ApiProperty({
    example: 'credit_card',
    enum: ['CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'BOLETO'],
  })
  type: 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'BOLETO';

  @ApiProperty({
    example: ['visa', 'mastercard'],
    required: false,
  })
  brands?: string[];
}
