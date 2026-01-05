import { ApiProperty } from '@nestjs/swagger';

export class PagbankCustomerDto {
  @ApiProperty({ example: 'João da Silva' })
  name: string;

  @ApiProperty({ example: 'joao@email.com' })
  email: string;
}
