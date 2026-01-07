import { ApiProperty } from '@nestjs/swagger';

export class PagbankPaymentConfigOptionDto {
  @ApiProperty({
    example: 'INSTALLMENTS_LIMIT',
    enum: ['INSTALLMENTS_LIMIT', 'INTEREST_FREE_INSTALLMENTS'],
  })
  option: 'INSTALLMENTS_LIMIT' | 'INTEREST_FREE_INSTALLMENTS';

  @ApiProperty({ example: '12' })
  value: string;
}

export class PagbankPaymentMethodConfigDto {
  @ApiProperty({
    example: 'CREDIT_CARD',
    enum: ['CREDIT_CARD', 'DEBIT_CARD'],
  })
  type: 'CREDIT_CARD' | 'DEBIT_CARD';

  @ApiProperty({ type: [PagbankPaymentConfigOptionDto] })
  configOptions: PagbankPaymentConfigOptionDto[];
}
