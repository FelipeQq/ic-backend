import { Module } from '@nestjs/common';
import { PagbankService } from './pagbank.service';

@Module({
  providers: [PagbankService],
  exports: [PagbankService],
})
export class PagbankModule {}
