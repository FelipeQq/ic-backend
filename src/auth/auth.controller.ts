import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  UseGuards,
  Get,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/decorators/auth.guard';
import { Logger } from '@nestjs/common';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
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
    this.logger.debug(
      `User ${user.id} - ${user.fullName} logged in successfully`,
    );

    return this.authService.login(user);
  }
  @UseGuards(JwtAuthGuard)
  @Get('validate')
  validateToken(@Req() req: any) {
    const user = req.user;
    return this.authService.validateUserGuardRouter(user, 'user');
  }
  @UseGuards(JwtAuthGuard)
  @Get('admin/validate')
  validateAdminToken(@Req() req: any) {
    const user = req.user;
    return this.authService.validateUserGuardRouter(user, 'admin');
  }
}
