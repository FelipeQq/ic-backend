import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import type { SendMailOptions } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly refreshToken: string;
  private readonly clientEmail: string;
  private readonly logger = new Logger(MailService.name);

  private mustGetEnv(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) throw new Error(`Missing environment variable: ${key}`);
    return value;
  }

  constructor(private configService: ConfigService) {
    this.clientId = this.mustGetEnv('CLIENT_ID_SERVER_EMAIL');
    this.clientSecret = this.mustGetEnv('CLIENT_SECRET_SERVER_EMAIL');
    this.refreshToken = this.mustGetEnv('REFRESH_TOKEN_SERVER_EMAIL');
    this.clientEmail = this.mustGetEnv('USER_CLIENT_SERVER_EMAIL');
  }

  loadTemplate(
    templateName: string,
    variables: Record<string, string>,
  ): string {
    try {
      const templatePath = path.join(
        process.cwd(),
        'src',
        'mail',
        'templates',
        `${templateName}.html`,
      );
      // const templatePath = path.join(
      //   __dirname,
      //   'templates',
      //   `${templateName}.html`,
      // );
      let template = fs.readFileSync(templatePath, 'utf8');

      // Substitui as variáveis no template
      Object.keys(variables).forEach((key) => {
        template = template.replace(
          new RegExp(`{${key}}`, 'g'),
          variables[key],
        );
      });

      return template;
    } catch (error) {
      this.logger.error('Erro ao carregar o template de e-mail:', error);
    }
  }

  private async renovarToken(refreshToken: string): Promise<string> {
    const requestBody = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    };

    try {
      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        requestBody,
      );
      console.log('Token de acesso renovado com sucesso.');
      return response.data.access_token;
    } catch (error) {
      this.logger.error('Erro ao renovar o token de acesso:', error);
      // throw error;
    }
  }
  async sendMail({
    to,
    bcc,
    subject,
    html,
    from,
    replyTo,
    text,
    attachments,
  }: {
    to?: string;
    bcc?: string;
    subject: string;
    html: string;
    from?: string;
    displayName?: string | null;
    replyTo?: string | null;
    text?: string;
    attachments?: SendMailOptions['attachments'];
  }) {
    try {
      const accessToken = await this.renovarToken(this.refreshToken);
      // Configurar o transporter do Nodemailer com o novo token de acesso

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: this.clientEmail,
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          refreshToken: this.refreshToken,
          accessToken: accessToken,
        },
      });

      const mailOptions: SendMailOptions = {
        from:
          from || 'Igreja de Cristo Cidade Verde <' + this.clientEmail + '>',
        ...(to ? { to: to } : { bcc: bcc }),
        replyTo: replyTo || this.clientEmail,
        subject: subject,
        html: html,
        text: text,
        attachments: attachments || [],
      };

      // const mailOptions: SendMailOptions = {
      //   from:
      //     options.from ||
      //     (options.displayName
      //       ? `"${options.displayName}" <${process.env.MAIL_SERVER}>`
      //       : `"Igreja de Cristo em " <${process.env.MAIL_SERVER}>`),
      //   replyTo: options.replyTo || process.env.MAIL_SERVER,
      //   ...(options.to ? { to: options.to } : { bcc: options.bcc }),
      //   subject: options.subject,
      //   html: options.html,
      //   text: options.text,
      //   attachments: options.attachments || [],
      // };

      const info = await transporter.sendMail(mailOptions);

      // transporter.sendMail(mailOptions, function (error, info) {
      //   if (error) {
      //     console.log('Erro ao enviar e-mail:', error);
      //   } else {
      //     console.log('E-mail de confirmação enviado:', info.response);
      //   }
      // });

      return info.response;
    } catch (error) {
      this.logger.error('Erro ao enviar e-mail:', error);
      // throw new InternalServerErrorException('Falha ao enviar e-mail.');
    }
  }
}
