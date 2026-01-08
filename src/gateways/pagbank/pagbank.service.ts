import { Injectable } from '@nestjs/common';
import { CreatePagbankCheckoutDto } from './dto/create-checkout.dto';
import { PagbankClient } from './pagbank.client';

@Injectable()
export class PagbankService {
  constructor(private readonly client: PagbankClient) {}

  async createCheckout(data: CreatePagbankCheckoutDto) {
    // Chama o cliente Pagbank para criar o checkout
    //ajustar a forma como o sistema precisa do dado
    return this.client.createCheckout(data);
  }
  async getCheckout(checkoutId: string) {
    return this.client.getCheckouts(checkoutId);
  }
}
