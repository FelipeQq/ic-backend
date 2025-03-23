import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(document: string, password: string): Promise<any> {
    const user = await this.usersService.findByDocument(document);
    if (user && (await bcrypt.compare(password, user.password))) {
      delete user.password;
      return user;
    }
    throw new UnauthorizedException();
  }

  async login(user: any) {
    const payload = { username: user.document, sub: user.id }; // Ensure user has document and id properties
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
