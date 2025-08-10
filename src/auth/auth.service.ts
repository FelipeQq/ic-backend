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

  async validateUserAdmin(userId: string): Promise<any> {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (user.role !== 1) {
      throw new UnauthorizedException('Usuário não é administrador');
    }

    return { id: user.id, role: user.role };
  }

  async validateUser(document: string, password: string): Promise<any> {
    const user = await this.usersService.findByDocument(document);
    // if (user) {
    //   delete user.password;
    //   return user;
    // }
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (await bcrypt.compare(password, user.password)) {
      delete user.password;
      return user;
    }
    throw new UnauthorizedException();
  }

  async login(user: any) {
    const payload = { username: user.document, sub: user.id }; // Ensure user has document and id properties
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}
