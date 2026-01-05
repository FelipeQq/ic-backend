import { Injectable, HttpException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class PagbankClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: 'https://api.pagbank.com.br',
      timeout: 15000,
    });
  }

  async createCheckout(payload: any, token: string) {
    try {
      const response = await this.http.post('/checkouts', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (err: any) {
      throw new HttpException(
        err.response?.data || 'Erro PagBank',
        err.response?.status || 500,
      );
    }
  }
  async getCheckouts(checkoutId: string, token: string) {
    try {
      const response = await this.http.get(`/checkouts/${checkoutId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      return response.data;
    } catch (err: any) {
      throw new HttpException(
        err.response?.data || 'Erro PagBank',
        err.response?.status || 500,
      );
    }
  }
}
