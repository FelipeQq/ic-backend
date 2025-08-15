import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class TeammDto {
  @ApiProperty({
    example: 'Servico',
    description: 'Campo destinado ao nome do time',
  })
  @IsString()
  name: string;

  event: any;

  user: any;
  @ApiProperty({
    example: 'Lorem ipsum dolor sit amet',
    description: 'Nota do time',
  })
  @IsString()
  @IsOptional()
  note: string;

  @ApiProperty({
    example: 2,
    description: 'Capacidade do time',
  })
  @IsNumber()
  capacity: number;

  @ApiProperty({
    example: [1, 2],
    description: 'ids dos usuarios',
  })
  @IsArray()
  usersId: string[];

  @ApiProperty({
    example: [1, 2],
    description: 'ids dos liders',
  })
  @IsArray()
  usersLeadersId: string[];
}
