import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class BedroomDto {
  @ApiProperty({
    example: 'Quarto dos pastores',
    description:
      'Campo destinado a qualquer observacao que pode conter no quarto',
  })
  @IsString()
  note?: string;

  event: any;

  user: any;

  @ApiProperty({
    example: [1, 2],
    description: 'ids dos usuarios',
  })
  @IsArray()
  usersId: number[];
}
