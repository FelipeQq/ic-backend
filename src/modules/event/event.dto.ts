import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';
export class EventDto {
  @ApiProperty({
    example: 'Retiro 2023',
    description: 'Nome do evento',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: '2023-02-17',
    description: 'Data que devera acontecer o evento',
  })
  startDate: Date;

  @ApiProperty({
    example: '2023-02-17',
    description: 'Data que devera encerrar o evento',
  })
  endDate: Date;

  @ApiProperty({
    example: 200,
    description: 'Preco do evento',
  })
  @IsInt()
  price: number;

  @ApiProperty({
    example: [1, 2],
    description: 'ids dos usuarios',
  })
  users?: number[];
}
