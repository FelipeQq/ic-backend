import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUserGuardRouter(user: any, test: string): Promise<any> {
    const userConsult = await this.usersService.findOne(user.userId);
    if (!userConsult) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (test === 'admin' && userConsult.role !== 1) {
      throw new UnauthorizedException('Usuário não é administrador');
    }
    return {
      id: userConsult.id,
      role: userConsult.role,
      fullName: userConsult.fullName,
      email: userConsult.email,
      cpf: userConsult.cpf,
      badgeName: userConsult.badgeName,
      profilePhotoUrl: userConsult.profilePhotoUrl,
    };
  }

  async validateUser(document: string, password: string): Promise<any> {
    const user = await this.usersService.findByDocument(document);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (await bcrypt.compare(password, user.password)) {
      // Remove a senha antes de retornar
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }

    throw new UnauthorizedException('Credenciais inválidas');
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}
