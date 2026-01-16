import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class CurlLoggerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();

    const method = req.method;
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    const headers = Object.entries(req.headers || {})
      .filter(([key]) => key !== 'content-length')
      .map(([key, value]) => `-H "${key}: ${value}"`)
      .join(' \\\n  ');

    let body = '';
    if (req.body && Object.keys(req.body).length > 0) {
      body = `-d '${JSON.stringify(req.body)}'`;
    }

    const curl = `curl -X ${method} "${url}" \\\n  ${headers} ${body}`;

    console.log('\n==================== CURL GERADO ====================');
    console.log(curl);
    console.log('=====================================================\n');

    return next.handle().pipe(
      tap((response) => {
        console.log('🟢 RESPONSE:', JSON.stringify(response, null, 2));
      }),
    );
  }
}
