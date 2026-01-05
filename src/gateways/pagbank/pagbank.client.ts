// gateways/pagbank/pagbank.client.ts
import axios from 'axios';

export class PagbankClient {
  private api = axios.create({
    baseURL: 'https://api.pagbank.com',
    headers: {
      Authorization: `Bearer ${process.env.PAGBANK_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  criarCheckout(payload: any) {
    return this.api.post('/checkouts', payload);
  }

  consultarPagamento(id: string) {
    return this.api.get(`/payments/${id}`);
  }
}
