import { ApiProperty } from '@nestjs/swagger';
import { EventType } from '@prisma/client';
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
    description: 'Grupos de regras do evento',
    example: [
      {
        id: 'uuid-v4',
        name: 'Grupo 1',
        capacity: 100,
        roles: [
          {
            id: 'uuid-v4',
            price: 100.0,
            description: 'Descrição da regra 1',
          },
          {
            price: 150.0,
            description: 'Descrição da regra 2',
          },
        ],
      },
    ],
  })
  groupRoles?: {
    id?: string;
    name: string;
    capacity: number;
    roles: { id?: string; price: number; description: string }[];
  }[];
  @ApiProperty({
    example: { local: 'Auditório Principal', address: 'Rua XYZ, 123' },
    description: 'Dados adicionais do evento',
  })
  data: Object;
  @ApiProperty({
    example: 'CURSILHO',
    description: 'Tipo do evento',
  })
  @IsString()
  type: EventType;
}
