import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class UserDTO {
  @ApiProperty({
    example: 'uluizfelipe@gmail.com',
    description: 'E-mail',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Felipe Queiroz',
    description: 'Nome do usuario',
  })
  @IsString()
  @MinLength(5)
  fullName: string;

  @ApiProperty({
    example: '10647111111',
  })
  @IsString()
  @MinLength(11)
  @MaxLength(11)
  cpf: string;

  @ApiProperty({
    example: '1993-11-20',
  })
  @IsString()
  birthday: Date;

  @ApiProperty({
    example: '84987445761',
  })
  @IsString()
  @MinLength(11)
  @MaxLength(11)
  cellphone: string;

  @ApiProperty({
    example: 'Evangelico',
    description: 'Deve conter a religiao do usuario',
  })
  religion?: string;

  @ApiProperty({
    example: 'Alergico',
    description: 'Este campo deve conter todas as observacoes sobre o usuario',
  })
  notes?: string;
}
