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
      headers: {
        Accept: '*/*',
      },
    });

    // Interceptor: injeta token + gera CURL
    this.http.interceptors.request.use((config) => {
      config.headers.Authorization = `Bearer ${process.env.TOKEN_API_PAG_BANCK?.trim()}`;

      const curl = this.generateCurl(config);

      console.log(
        '\n================ OUTGOING CURL (PAGBANK) ================',
      );
      console.log(curl);
      console.log(
        '=========================================================\n',
      );

      return config;
    });

    // Interceptor de response (sucesso)
    this.http.interceptors.response.use(
      (response) => {
        console.log('🟢 PAGBANK RESPONSE:', {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        console.log('🔴 PAGBANK ERROR RESPONSE:', {
          status: error?.response?.status,
          data: error?.response?.data,
        });
        return Promise.reject(error);
      },
    );
  }
  private generateCurl(config: any): string {
    const method = config.method?.toUpperCase();
    const url = `${config.baseURL}${config.url}`;

    const headers = Object.entries(config.headers || {})
      .map(([k, v]) => `-H "${k}: ${v}"`)
      .join(' \\\n  ');

    let body = '';

    if (config.data) {
      if (typeof config.data === 'string') {
        body = `-d '${config.data}'`;
      } else {
        body = `-d '${JSON.stringify(config.data)}'`;
      }
    }

    return `curl -X ${method} "${url}" \\\n  ${headers}${
      body ? ' \\\n  ' + body : ''
    }`;
  }
  async createCheckout(payload: CreatePagbankCheckoutDto) {
    try {
      const response = await this.http.post('/checkouts', payload);
      return response.data;
    } catch (err: any) {
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
