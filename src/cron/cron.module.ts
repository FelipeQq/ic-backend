import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './cron.service';
import { PagbankService } from 'src/gateways/pagbank/pagbank.service';
import { PagbankClient } from 'src/gateways/pagbank/pagbank.client';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [CronService, PagbankService, PagbankClient],
})
export class CronModule {}
