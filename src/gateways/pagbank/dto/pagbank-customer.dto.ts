import { ApiProperty } from '@nestjs/swagger';

export class PagbankCustomerPhoneDto {
  @ApiProperty({ example: '55' })
  country: string;

  @ApiProperty({ example: '11' })
  area: string;

  @ApiProperty({ example: '987654321' })
  number: string;
}

export class PagbankCustomerDto {
  @ApiProperty({ example: 'João da Silva' })
  name: string;

  @ApiProperty({ example: 'joao@email.com' })
  email: string;

  @ApiProperty({ example: '12345678909', required: false })
  taxId?: string;

  @ApiProperty({ type: PagbankCustomerPhoneDto, required: false })
  phone?: PagbankCustomerPhoneDto;
}
