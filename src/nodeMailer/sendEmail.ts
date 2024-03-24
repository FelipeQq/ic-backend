import * as nodemailer from 'nodemailer';
import axios from 'axios';
import {
  CLIENT_ID_SERVER_EMAIL,
  CLIENT_SECRET_SERVER_EMAIL,
  REFRESH_TOKEN_SERVER_EMAIL,
  USER_CLIENT_SERVER_EMAIL,
} from 'src/secret';

// Interface para o corpo da solicitação do token
interface TokenRequestBody {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  grant_type: string;
}

// Interface para opções de e-mail
interface MailOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
  attachments: { path: string; filename: string }[];
}

// Função para renovar o token de acesso
async function renovarToken(refreshToken: string): Promise<string> {
  const requestBody: TokenRequestBody = {
    client_id: CLIENT_ID_SERVER_EMAIL,
    client_secret: CLIENT_SECRET_SERVER_EMAIL,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  };

  try {
    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      requestBody,
    );
    return response.data.access_token;
  } catch (error) {
    console.error(
      'Erro ao renovar o token de acesso:',
      error.response.data.error,
    );
    throw error;
  }
}

// Função para enviar e-mail de confirmação com anexo
export async function enviarEmailConfirmacao(
  fullName: string,
  email: string,
  isWorker: boolean,
): Promise<void> {
  // Renovar o token de acesso antes de enviar o e-mail
  try {
    const accessToken = await renovarToken(refreshToken);

    // Configurar o transporter do Nodemailer com o novo token de acesso

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: USER_CLIENT_SERVER_EMAIL,
        clientId: CLIENT_ID_SERVER_EMAIL,
        clientSecret: CLIENT_SECRET_SERVER_EMAIL,
        refreshToken: refreshToken,
        accessToken: accessToken,
      },
    });

    const mailOptions: MailOptions = {
      from: USER_CLIENT_SERVER_EMAIL,
      to: email,
      subject: assunto,
      text: corpo(fullName, isWorker),
      attachments: [
        {
          path: anexoPath, // Caminho do anexo no sistema de arquivos
          filename: anexoNome, // Nome do anexo
        },
      ],
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log('Erro ao enviar e-mail:', error);
      } else {
        console.log('E-mail de confirmação enviado:', info.response);
      }
    });
  } catch (error) {
    console.error('Erro ao enviar o e-mail de confirmação:', error);
  }
}

// Exemplo de uso:
//const destinatario = 'billycrazy98@gmail.com';

const assunto =
  'Confirmação de Inscrição - 7° Cursilho Masculino da Cristandade da Igreja de Cristo';
const corpo = (fullName: string, isWorker: boolean) => {
  const groupWpp = isWorker
    ? ''
    : 'Link para grupo no WhatsApp: https://chat.whatsapp.com/J7Yu5jpJcry72HX6QWJswK';

  return `Assunto: Confirmação de Inscrição - 7° Cursilho Masculino da Cristandade da Igreja de Cristo
  
  Prezado ${fullName},
  
  -É com grande alegria que confirmamos sua inscrição no 7° Cursilho Masculino da Cristandade da Igreja de Cristo, que acontecerá nos dias 30 de maio a 02 de junho, no(a) Granja Monte Moriá.
  
  -Agradecemos sinceramente por se juntar a nós neste momento de crescimento espiritual e compartilhamento de fé. Estamos ansiosos para viver juntos uma experiência significativa e inspiradora durante o evento.
  
  📢📢Fique atento para futuras comunicações contendo informações detalhadas sobre a programação, procedimentos de chegada, lista de itens necessários e quaisquer atualizações relevantes.
  
  ✔️Se surgir alguma dúvida ou se precisar de assistência adicional, por favor, não hesite em entrar em contato conosco.
  
  🫂Estamos ansiosos para recebê-lo pessoalmente no 7° Cursilho Masculino da Cristandade da Igreja de Cristo!
  
  🤝Deus conta com você!
  
  ${groupWpp}
  
  Pr. Kleber Junior de Sousa
  Lider Espiritual
  84 99170-1727
  `;
};

// Coloque o refreshToken atual aqui
const refreshToken = REFRESH_TOKEN_SERVER_EMAIL;
const anexoPath = 'src/nodeMailer/testepdfemail.pdf'; // Substitua pelo caminho do arquivo
const anexoNome = 'testepdfemail.pdf'; // Substitua pelo nome do arquivo

//enviarEmailConfirmacao(destinatario, assunto, corpo, refreshToken, anexoPath, anexoNome);
