import { ApiProperty } from '@nestjs/swagger';

export class PagbankAddressDto {
  @ApiProperty({ example: 'Rua Exemplo' })
  street: string;

  @ApiProperty({ example: '123' })
  number: string;

  @ApiProperty({ example: 'Apto 10', required: false })
  complement?: string;

  @ApiProperty({ example: 'Centro' })
  locality: string;

  @ApiProperty({ example: 'São Paulo' })
  city: string;

  @ApiProperty({ example: 'SP' })
  regionCode: string;

  @ApiProperty({ example: 'BR' })
  country: string;

  @ApiProperty({ example: '01001000' })
  postalCode: string;
}

export class PagbankShippingDto {
  @ApiProperty({ example: 'FIXED', enum: ['FIXED', 'FREE', 'CALCULATE'] })
  type: 'FIXED' | 'FREE' | 'CALCULATE';

  @ApiProperty({ example: 1500, required: false })
  amount?: number;

  @ApiProperty({ example: true, required: false })
  addressModifiable?: boolean;

  @ApiProperty({ type: PagbankAddressDto, required: false })
  address?: PagbankAddressDto;
}
