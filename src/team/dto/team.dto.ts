import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

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
    example: [1, 2],
    description: 'ids dos usuarios',
  })
  @IsArray()
  usersId: string[];
}
