import { ApiProperty } from '@nestjs/swagger';

export class PagbankPaymentMethodDto {
  @ApiProperty({
    example: 'credit_card',
    enum: ['credit_card', 'debit_card', 'PIX', 'BOLETO'],
  })
  type: 'credit_card' | 'debit_card' | 'PIX' | 'BOLETO';

  @ApiProperty({
    example: ['visa', 'mastercard'],
    required: false,
  })
  brands?: string[];
}
