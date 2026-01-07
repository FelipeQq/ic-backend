import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreatePaymentCheckoutDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsUUID()
  eventId: string;

  @ApiProperty({ type: [String] })
  @IsUUID('4', { each: true })
  roleRegistrationId: string[];
}
