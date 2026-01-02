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
    example: ['userId1', 'userId2'],
    description: 'Lista de IDs dos usuários associados ao evento',
  })
  users?: string[];
  @ApiProperty({
    example: [
      { description: 'standard', price: 100, capacity: 50 },
      { description: 'vip', price: 200, capacity: 20 },
    ],
    description: 'Tipos de inscrição disponíveis para o evento',
  })
  registrationTypes?: {
    id?: string;
    description: string;
    price: number;
    capacity: number;
  }[];
}
