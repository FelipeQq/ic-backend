import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, PaymentReceived } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsUUID()
  eventId: string;

  @ApiProperty({ type: [String] })
  @IsUUID('4', { each: true })
  roleRegistrationId: string[];

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty({ enum: PaymentReceived, required: false })
  @IsOptional()
  @IsEnum(PaymentReceived)
  receivedFrom?: PaymentReceived;
}
