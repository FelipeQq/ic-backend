import { Injectable, HttpException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { CreatePagbankCheckoutDto } from './dto/create-checkout.dto';

@Injectable()
export class PagbankClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: process.env.URL_API_PAG_BANCK,
      timeout: 15000,
    });
  }

  async createCheckout(payload: CreatePagbankCheckoutDto) {
    try {
      const response = await this.http.post('/checkouts', payload, {
        headers: {
          Authorization: `Bearer ${process.env.TOKEN_API_PAG_BANCK}`,
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
  async getCheckouts(checkoutId: string) {
    try {
      const response = await this.http.get(`/checkouts/${checkoutId}`, {
        headers: {
          Authorization: `Bearer ${process.env.TOKEN_API_PAG_BANCK}`,
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

  async inactivateCheckout(checkoutId: string) {
    try {
      const response = await this.http.post(
        `/checkouts/${checkoutId}/inactivate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${process.env.TOKEN_API_PAG_BANCK}`,
            Accept: 'application/json',
          },
        },
      );

      return response.data;
    } catch (err: any) {
      throw new HttpException(
        err.response?.data || 'Erro PagBank',
        err.response?.status || 500,
      );
    }
  }
}
