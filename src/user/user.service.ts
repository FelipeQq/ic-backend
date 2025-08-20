import {
  BadRequestException,
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
        data: {
          ...data,
          password:
            '$2b$10$QGF/lucztAy.bqQFEQcSOOjP3fGMZfSsCIl4t.dfFo15Hh0v/C8xW',
        },
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
      where: { id: idUser },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado!');
    }

    if (!idEvent) {
      throw new BadRequestException('ID do evento não fornecido!');
    }

    const hasEvent = await this.prisma.event.findFirst({
      where: { id: idEvent },
    });

    if (!hasEvent) {
      throw new NotFoundException('Evento não encontrado!');
    }

    const hasRelationEventOnUser = await this.prisma.eventOnUsers.findFirst({
      where: { userId: user.id, eventId: idEvent },
    });

    if (hasRelationEventOnUser) {
      throw new ConflictException('Usuário já está inscrito neste evento!');
    }

    const event = await this.prisma.eventOnUsers.create({
      data: {
        eventId: idEvent,
        userId: user.id,
        paid: false,
        worker,
      },
    });

    await enviarEmailConfirmacao(
      user.fullName,
      user.email,
      worker,
      hasEvent.name,
      hasEvent.startDate,
      hasEvent.endDate,
    );

    return event;
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
      include: {
        events: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
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
  async findInsightsEvents() {
    // verifica quais usuarios tem recorrencia em eventos em um ano
    const currentYear = new Date().getFullYear() - 1;
    const usersWithEvents = await this.prisma.user.count({
      where: {
        events: {
          some: {
            event: {
              startDate: {
                gte: new Date(`${currentYear}-01-01`),
                lt: new Date(`${currentYear + 1}-01-01`),
              },
            },
          },
        },
      },
    });
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        role: true,
      },
    });

    return {
      totalUsers: users.length,
      totalUsersAdmin: users.filter((user) => user.role === 1).length,
      usersWithEvents,
    };
  }
}
