import { Module } from '@nestjs/common';
import { PagbankService } from './pagbank.service';
import { PagbankClient } from './pagbank.client';

@Module({
  providers: [PagbankClient, PagbankService],
  exports: [PagbankService],
})
export class PagbankModule {}
