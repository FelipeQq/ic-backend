import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { UserDTO } from './user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(data: UserDTO) {
    const userEmailExists = await this.prisma.user.findFirst({
      where: {
        email: data.email,
      },
    });

    if (userEmailExists) {
      throw new ConflictException('Já existe um usuario com este e-mail');
    }

    try {
      data.birthday = new Date(data.birthday);

      await this.prisma.user.create({
        data,
      });
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findOne(id: number) {
    return this.prisma.user.findFirst({ where: { id } });
  }

  async update(id: number, data: UserDTO) {
    const userExists = await this.prisma.user.findUnique({
      where: {
        id: +id,
      },
    });

    if (!userExists) {
      throw new NotFoundException('User does not exists!');
    }

    try {
      data.birthday = new Date(data.birthday);

      await this.prisma.user.update({
        data,
        where: {
          id: +id,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }
}
