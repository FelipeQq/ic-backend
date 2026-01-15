import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus, PaymentMethod } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdatePaymentStatusDto {
  @ApiProperty({ enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  @IsOptional()
  receiptFile?: Express.Multer.File;

  @ApiProperty({ type: 'string', required: false })
  @IsOptional()
  paymentId?: string;

  @ApiProperty({ type: 'string', required: false })
  @IsOptional()
  discountsAppliedId?: string;
}
