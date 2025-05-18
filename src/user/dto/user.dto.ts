import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UserDTO {
  @ApiProperty({
    example: 'url',
    description: 'Imagem',
  })
  @IsString()
  @IsOptional()
  profilePhotoUrl?: string;

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
    example: '123456',
    description: 'Senha',
  })
  @IsString()
  @IsOptional()
  password?: string;

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
    example: 1,
    description: 'Papel - 1 - Admin',
  })
  @IsInt()
  role?: number;

  @ApiProperty({
    example: '84987445761',
  })
  @IsString()
  @MinLength(11)
  @MaxLength(11)
  cellphone: string;

  @ApiProperty({
    example: true,
  })
  @IsBoolean()
  diabetes: boolean;

  @ApiProperty({
    example: true,
  })
  @IsBoolean()
  hypertensive: boolean;

  @ApiProperty({
    example: 'Pastor',
    description: 'Profissão',
  })
  @IsString()
  @MinLength(2)
  profession: string;

  @ApiProperty({
    example: 'Parque das arvores',
    description: 'Bairro',
  })
  @IsString()
  neighborhood: string;

  @ApiProperty({
    example: 'Natal',
    description: 'Cidade',
  })
  @IsString()
  @MinLength(2)
  city: string;

  @ApiProperty({
    example: 'RN',
    description: 'Estado',
  })
  @IsString()
  @MinLength(2)
  state: string;

  @ApiProperty({
    example: false,
  })
  @IsBoolean()
  worker: boolean;

  @ApiProperty({
    example: '84987445761',
  })
  @IsString()
  @IsOptional()
  @MinLength(11)
  @MaxLength(11)
  emergencyContact?: string;

  @ApiProperty({
    example: 'Felipe',
    description: 'Quem indicou?',
  })
  @IsString()
  @IsOptional()
  indicatedBy?: string;

  @ApiProperty({
    example: 'Pastor',
    description: 'Cargo de liderança',
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  leadershipPosition?: string;

  @IsString()
  @IsOptional()
  eventId?: string;

  @ApiProperty({
    example: 'Evangelico',
    description: 'Deve conter a religiao do usuario',
  })
  @IsOptional()
  religion?: string;

  @ApiProperty({
    example: 'Alergico',
    description: 'Este campo deve conter todas as observacoes sobre o usuario',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
