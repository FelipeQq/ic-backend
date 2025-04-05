import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { UserDTO } from './dto/user.dto';
import { enviarEmailConfirmacao } from 'src/nodeMailer/sendEmail';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

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
      // const eventId = data.eventId;
      // delete data.eventId;

      const user = await this.prisma.user.create({
        data,
      });
      const payload = { username: user.cpf, sub: user.id };
      return {
        access_token: this.jwtService.sign(payload),
        user,
      };
      // let event = {};
      // if (eventId) {
      //   const hasEvent = await this.prisma.event.findFirst({
      //     where: { id: eventId },
      //   });

      //   if (hasEvent) {
      //     event = await this.prisma.eventOnUsers.create({
      //       data: {
      //         eventId,
      //         userId: user.id,
      //         paid: false,
      //       },
      //     });
      //   }
      // }
      // if (user && event) {
      //   await enviarEmailConfirmacao(user.fullName, user.email, user.worker);
      // }
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async createRelationEvent(idUser: string, idEvent: string, worker: boolean) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: idUser,
      },
    });

    try {
      const eventId = idEvent;

      let event = {};
      if (eventId) {
        const hasEvent = await this.prisma.event.findFirst({
          where: { id: eventId },
        });

        if (hasEvent) {
          event = await this.prisma.eventOnUsers.create({
            data: {
              eventId,
              userId: user.id,
              paid: false,
              worker,
            },
          });
        }
        if (user && event) {
          await enviarEmailConfirmacao(
            user.fullName,
            user.email,
            worker,
            hasEvent.name,
          );
        }
      }
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
      orderBy: {
        role: 'asc',
      },
    });

    return users;
  }

  async findByDocument(document: string) {
    if (!document) return null;
    return this.prisma.user.findUnique({ where: { cpf: document } });
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

    const existEventRelation = await this.prisma.eventOnUsers.findFirst({
      where: { userId: id, eventId: data.eventId },
    });

    try {
      data.birthday = new Date(data.birthday);
      const eventId = data.eventId;
      delete data.eventId;

      await this.prisma.user.update({
        data,
        where: {
          id,
        },
      });

      if (eventId && !existEventRelation) {
        await this.prisma.eventOnUsers.create({
          data: {
            eventId,
            userId: id,
            paid: false,
          },
        });
      }
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }
}
