import { Injectable, HttpException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { CreatePagbankCheckoutDto } from './dto/create-checkout.dto';

@Injectable()
export class PagbankClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: process.env.URL_API_PAG_BANK,
      timeout: 15000,
      headers: {
        Accept: '*/*',
      },
    });

    // Interceptor para sempre injetar o token corretamente
    this.http.interceptors.request.use((config) => {
      config.headers.Authorization = `Bearer ${process.env.TOKEN_API_PAG_BANK?.trim()}`;
      return config;
    });
  }

  async createCheckout(payload: CreatePagbankCheckoutDto) {
    try {
      const response = await this.http.post('/checkouts', payload);
      return response.data;
    } catch (err: any) {
      console.log(err);
      throw new HttpException(
        err.response?.data || 'Erro PagBank',
        err.response?.status || 500,
      );
    }
  }

  async getCheckout(checkoutId: string) {
    try {
      const response = await this.http.get(`/checkouts/${checkoutId}`);
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
      );
      return response.data;
    } catch (err: any) {
      throw new HttpException(
        err.response?.data || 'Erro PagBank',
        err.response?.status || 500,
      );
    }
  }

  async getPaymentStatus(referenceId: string) {
    try {
      const response = await this.http.get('/charges', {
        params: { reference_id: referenceId },
      });

      return response.data;
    } catch (err: any) {
      throw new HttpException(
        err.response?.data || 'Erro PagBank',
        err.response?.status || 500,
      );
    }
  }

  private logError(err: any) {
    console.error('PagBank ERROR:', {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
  }
}
