import { ApiProperty } from '@nestjs/swagger';

export class PagbankAmountSummaryDto {
  @ApiProperty({ example: 500 })
  total: number;

  @ApiProperty({ example: 500 })
  paid: number;

  @ApiProperty({ example: 0 })
  refunded: number;
}

export class PagbankAmountDto {
  @ApiProperty({ example: 500 })
  value: number;

  @ApiProperty({ example: 'BRL' })
  currency: string;

  @ApiProperty({ type: PagbankAmountSummaryDto })
  summary: PagbankAmountSummaryDto;
}
export class PagbankPaymentResponseDto {
  @ApiProperty({ example: '20000' })
  code: string;

  @ApiProperty({ example: 'SUCESSO' })
  message: string;

  @ApiProperty({ example: '1606012224352' })
  reference: string;
}

export class PagbankPaymentHolderDto {
  @ApiProperty({ example: 'Francisco da Silva' })
  name: string;

  @ApiProperty({ example: '***534218**' })
  taxId: string;
}

export class PagbankPaymentMethodDto {
  @ApiProperty({ example: 'PIX' })
  type: string;

  @ApiProperty({ type: PagbankPaymentHolderDto })
  holder: PagbankPaymentHolderDto;
}

export class PagbankLinkDto {
  @ApiProperty({ example: 'SELF' })
  rel: string;

  @ApiProperty({
    example:
      'https://sandbox.api.pagseguro.com/charges/CHAR_F1F10115-09F4-4560-85F5-A828D9F96300',
  })
  href: string;

  @ApiProperty({ example: 'application/json' })
  media: string;

  @ApiProperty({ example: 'GET' })
  type: string;
}

export class PagbankChargeDto {
  @ApiProperty({
    example: 'CHAR_F1F10115-09F4-4560-85F5-A828D9F96300',
  })
  id: string;

  @ApiProperty({ example: 'referencia da cobranca' })
  reference_id: string;

  @ApiProperty({ example: 'PAID' })
  status: string;

  @ApiProperty({ example: '2020-11-21T23:30:22.695-03:00' })
  created_at: string;

  @ApiProperty({
    example: '2020-11-21T23:30:24.352-03:00',
    required: false,
  })
  paid_at?: string;

  @ApiProperty({
    example: 'descricao da cobranca',
    required: false,
  })
  description?: string;

  @ApiProperty({ type: PagbankAmountDto })
  amount: PagbankAmountDto;

  @ApiProperty({ type: PagbankPaymentResponseDto })
  payment_response: PagbankPaymentResponseDto;

  @ApiProperty({ type: PagbankPaymentMethodDto })
  payment_method: PagbankPaymentMethodDto;

  @ApiProperty({ type: [PagbankLinkDto] })
  links: PagbankLinkDto[];
}
