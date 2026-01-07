import { ApiProperty } from '@nestjs/swagger';

export class PagbankItemDto {
  @ApiProperty({ example: 'ITEM_001' })
  reference_id: string;

  @ApiProperty({ example: 'Inscrição Evento XYZ' })
  name: string;

  @ApiProperty({ example: 'Acesso completo ao evento', required: false })
  description?: string;

  @ApiProperty({ example: 1 })
  quantity: number;

  @ApiProperty({
    example: 15000,
    description: 'Valor unitário em centavos',
  })
  unit_amount: number;

  @ApiProperty({ required: false })
  image_url?: string;
}
