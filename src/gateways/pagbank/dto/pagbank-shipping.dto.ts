import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class PagbankAddressDto {
  @ApiProperty({ example: 'Rua Exemplo' })
  @IsOptional()
  street?: string;

  @ApiProperty({ example: '123' })
  @IsOptional()
  number?: string;

  @ApiProperty({ example: 'Apto 10', required: false })
  @IsOptional()
  complement?: string;

  @ApiProperty({ example: 'Centro' })
  @IsOptional()
  locality?: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsOptional()
  city?: string;

  @ApiProperty({ example: 'SP' })
  @IsOptional()
  region_code?: string;

  @ApiProperty({ example: 'BR' })
  @IsOptional()
  country?: string;

  @ApiProperty({ example: '01001000' })
  @IsOptional()
  postal_code?: string;
}

export class PagbankShippingDto {
  @ApiProperty({ example: 'FIXED', enum: ['FIXED', 'FREE', 'CALCULATE'] })
  type: 'FIXED' | 'FREE' | 'CALCULATE';

  @ApiProperty({ example: 1500, required: false })
  amount?: number;

  @ApiProperty({ example: true, required: false })
  address_modifiable?: boolean;

  @ApiProperty({ type: PagbankAddressDto, required: false })
  address?: PagbankAddressDto;
}
