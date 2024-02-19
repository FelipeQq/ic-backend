import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { UserDTO } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(data: UserDTO) {
    const userCpfExists = await this.prisma.user.findFirst({
      where: {
        cpf: data.cpf,
      },
    });

    if (userCpfExists) {
      throw new ConflictException('Já existe um usuario com este cpf!');
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

  async setProfilePhoto(id: string, photoUrl: string): Promise<UserDTO> {
    return this.prisma.user.update({
      where: { id },
      data: { profilePhotoUrl: photoUrl },
    });
  }

  async findAll(filters?: Partial<UserDTO>) {
    const users = await this.prisma.user.findMany({
      where: {
        fullName: { contains: filters?.fullName || undefined },
        email: { contains: filters?.email || undefined },
      },
    });

    return users;
  }

  async findOne(id: string) {
    return this.prisma.user.findFirst({ where: { id } });
  }

  async update(id: string, data: UserDTO) {
    const userExists = await this.prisma.user.findUnique({
      where: {
        id,
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
          id,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }
}
