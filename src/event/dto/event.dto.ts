import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsString } from 'class-validator';
export class EventDto {
  @ApiProperty({
    example: 'Retiro 2023',
    description: 'Nome do evento',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'https://chat.whatsapp.com/xxxxxxxxxxxxxxxxxxxx',
    description: 'Link do grupo do whatsapp',
  })
  @IsString()
  groupLink: string;

  @ApiProperty({
    example: true,
    description: 'Status do evento (ativo/inativo)',
  })
  @IsBoolean()
  isActive: boolean;

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
    description: 'Preco para quem vai trabalhar',
  })
  @IsInt()
  workerPrice: number;

  @ApiProperty({
    example: 200,
    description: 'Preco do evento',
  })
  @IsInt()
  price: number;

  @ApiProperty({
    example: 200,
    description: 'Capacidade maxima do evento',
  })
  @IsInt()
  capacity: number;

  @ApiProperty({
    example: 50,
    description: 'Capacidade maxima de trabalhadores do evento',
  })
  @IsInt()
  capacityWorker: number;

  @ApiProperty({
    example: ['6e893017-aec6-4d16-a816-4789c8d23333'],
    description: 'ids dos usuarios',
  })
  users?: string[];
}
