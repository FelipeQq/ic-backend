import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  UseGuards,
  Get,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/decorators/auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        document: { type: 'string', example: '10647145448' },
        password: { type: 'string', example: 'password123' },
      },
    },
  })
  async login(@Body() loginDto: { document: string; password: string }) {
    const user = await this.authService.validateUser(
      loginDto.document,
      loginDto.password,
    );

    return this.authService.login(user);
  }
  @UseGuards(JwtAuthGuard)
  @Get('validate')
  validateToken(@Req() req: any) {
    return req.user;
  }
  @UseGuards(JwtAuthGuard)
  @Get('admin/validate')
  validateAdminToken(@Req() req: any) {
    return this.authService.validateUserAdmin(req.user.userId);
  }
}
