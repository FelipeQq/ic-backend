import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class BedroomDto {
  @ApiProperty({
    example: 'Quarto dos pastores',
    description:
      'Campo destinado a qualquer observacao que pode conter no quarto',
  })
  @IsString()
  @IsOptional()
  note?: string;

  event: any;

  user: any;
  @ApiProperty({
    example: 'Quarto Laranja',
    description: 'Nome do quarto',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 2,
    description: 'capacidade do quarto',
  })
  @IsNumber()
  capacity: number;

  @ApiProperty({
    example: ['Familia', 'masculino'],
    description: 'nomes das tags',
  })
  @IsArray()
  tags: string[];

  @ApiProperty({
    example: [1, 2],
    description: 'ids dos usuarios',
  })
  @IsArray()
  usersId: string[];
}
