import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaService } from '../prisma';
import { EventDto } from './dto/event.dto';
import { enviarEmailConfirmacao } from 'src/nodeMailer/sendEmail';

@Injectable()
export class EventService {
  constructor(private prisma: PrismaService) {}

  async registerUserInEvent(
    userId: string,
    eventId: string,
    registrationTypeId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx ?? this.prisma;

    const result = tx
      ? await this._registerUserInEventTx(
          prisma,
          userId,
          eventId,
          registrationTypeId,
        )
      : await this.prisma.$transaction(async (trx) =>
          this._registerUserInEventTx(trx, userId, eventId, registrationTypeId),
        );

    // fora da transação
    await enviarEmailConfirmacao(
      result.user.fullName,
      result.user.email,
      false,
      result.event.name,
      result.event.startDate,
      result.event.endDate,
    );

    return result.data;
  }

  private async _registerUserInEventTx(
    tx: PrismaService | Prisma.TransactionClient,
    userId: string,
    eventId: string,
    registrationTypeId: string,
  ) {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    const alreadyRegistered = await tx.eventOnUsers.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });
    if (alreadyRegistered) {
      throw new BadRequestException('User already registered');
    }

    // 🔒 lock no tipo de inscrição
    const [registrationType] = await tx.$queryRaw<
      { capacity: number | null }[]
    >`
    SELECT capacity
    FROM registration_types
    WHERE id = ${registrationTypeId}
      AND "eventId" = ${eventId}
    FOR UPDATE
  `;

    if (!registrationType) {
      throw new NotFoundException('Registration type not found');
    }

    // 🔒 lock nos inscritos
    await tx.$queryRaw`
    SELECT 1
    FROM event_on_users
    WHERE "registrationTypeId" = ${registrationTypeId}
    FOR UPDATE
  `;

    const count = await tx.eventOnUsers.count({
      where: { registrationTypeId },
    });

    if (
      registrationType.capacity !== null &&
      count >= registrationType.capacity
    ) {
      return {
        type: 'WAITLIST',
        data: await tx.waitlist.create({
          data: { userId, eventId, registrationTypeId },
        }),
        user,
        event,
      };
    }

    return {
      type: 'REGISTERED',
      data: await tx.eventOnUsers.create({
        data: { userId, eventId, registrationTypeId },
      }),
      user,
      event,
    };
  }

  async removeRelation(idUser: string, idEvent: string) {
    const relationExists = await this.prisma.eventOnUsers.findFirst({
      where: { userId: idUser, eventId: idEvent },
    });
    if (!relationExists) {
      throw new NotFoundException('Relation does not exists!');
    }
    await this.prisma.eventOnUsers
      .delete({
        where: { userId_eventId: { userId: idUser, eventId: idEvent } },
      })
      .catch(() => {
        throw new InternalServerErrorException();
      });
  }

  async updateUserFromEvent(
    userId: string,
    eventId: string,
    data: { registrationTypeId?: string },
  ) {
    if (!data.registrationTypeId) {
      throw new BadRequestException('New registration type is required');
    }

    return await this.prisma.$transaction(async (tx) => {
      const relation = await tx.eventOnUsers.findUnique({
        where: {
          userId_eventId: { userId, eventId },
        },
        include: {
          registrationType: true,
        },
      });

      if (!relation) {
        throw new NotFoundException('User is not registered in this event');
      }

      // Busca o novo tipo de inscrição (e garante que pertence ao evento)
      const newRegistrationType = await tx.registrationTypes.findFirst({
        where: {
          id: data.registrationTypeId,
          eventId,
        },
        include: {
          _count: { select: { users: true } },
        },
      });

      if (!newRegistrationType) {
        throw new NotFoundException(
          'Registration type does not belong to this event',
        );
      }

      // Valida capacidade
      if (
        newRegistrationType.capacity !== null &&
        newRegistrationType._count.users >= newRegistrationType.capacity
      ) {
        throw new BadRequestException(
          'Registration type capacity has already been reached',
        );
      }

      //  Evita update inútil
      if (relation.registrationTypeId === newRegistrationType.id) {
        return relation;
      }

      //  Atualiza relação
      return await tx.eventOnUsers.update({
        where: {
          userId_eventId: { userId, eventId },
        },
        data: {
          registrationTypeId: newRegistrationType.id,
        },
      });
    });
  }

  private handlerReturnEvent(event) {
    function transformData(event) {
      if (!event?.users) return { ...event, users: [] };

      const formattedUsers = event.users.map((user) => ({
        ...user.user,
        paid: user.paid || false,
        worker: user.worker || false,
      }));

      return {
        ...event,
        users: formattedUsers,
      };
    }

    if (Array.isArray(event)) {
      return event.map(transformData);
    }

    return transformData(event);
  }
  private handleReturnUsersByEvent(users, idEvent) {
    return users.map((user: any) => {
      const userBedrooms =
        user.bedrooms
          ?.filter((b: any) => b.bedrooms?.eventId === idEvent)
          .map((b: any) => b.bedrooms) ?? [];
      const userTeamOnUsers =
        user.TeamOnUsers?.filter((t: any) => t.team?.eventId === idEvent).map(
          (t: any) => t.team,
        ) ?? [];
      const userEvent = user.events?.find((e: any) => e.eventId === idEvent);

      delete user.events;
      delete user.bedrooms;
      delete user.TeamOnUsers;
      return {
        ...user,
        bedrooms: userBedrooms,
        teams: userTeamOnUsers,
        worker: userEvent?.worker || false,
        paid: userEvent?.paid || false,
      };
    });
  }

  async create(data: EventDto) {
    try {
      data.endDate = new Date(data.endDate);
      data.startDate = new Date(data.startDate);

      await this.prisma.event.create({
        data: {
          endDate: data.endDate,
          startDate: data.startDate,
          name: data.name,
          data: data.data as Prisma.JsonObject,
          registrationTypes: {
            createMany: {
              data: data.registrationTypes,
            },
          },
          groupLink: data.groupLink,
          isActive: true,
        },
      });
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async findInsightsEvents() {
    // const events = await this.prisma.event.findMany({
    //   select: {
    //     isActive: true,
    //     id: true,
    //     name: true,
    //     startDate: true,
    //     capacity: true,
    //     capacityWorker: true,
    //     users: {
    //       select: {
    //         createdAt: true, // precisa estar no select para calcular
    //         worker: true,
    //       },
    //     },
    //   }, // caso use TS, pois não existe "createdAt" no include, é no select
    // });

    // //calcular a media de ventos por trimestre
    // const trimestres = [0, 0, 0, 0]; // índice 0 = 1º tri, 1 = 2º tri...

    // events.forEach((event) => {
    //   const eventDate = new Date(event.startDate);
    //   const quarter = Math.floor(eventDate.getMonth() / 3); // 0–3
    //   trimestres[quarter]++;
    // });

    // // Soma total de eventos e divide por 4 trimestres
    // const totalEventos = trimestres.reduce((acc, val) => acc + val, 0);
    // const eventsInCurrentQuarter = totalEventos / 4;

    // // Calcula o tempo médio para lotar por evento individual
    // const totalEventsActive = events.filter((e) => e.isActive).length;
    // const totalEvents = events.length;

    // const totalTimeToFill = events.reduce(
    //   (acc, event) => {
    //     const getTimeToFill = (
    //       users: { createdAt: Date }[],
    //       capacity: number,
    //     ) => {
    //       if (users.length !== capacity) return null;

    //       let min = Infinity;
    //       let max = -Infinity;

    //       for (const u of users) {
    //         const t = u.createdAt.getTime();
    //         if (t < min) min = t;
    //         if (t > max) max = t;
    //       }

    //       return (max - min) / (1000 * 60 * 60); // horas
    //     };

    //     const timeToFill = getTimeToFill(
    //       event.users.filter((u) => !u.worker),
    //       event.capacity,
    //     );

    //     const timeToFillWorker = getTimeToFill(
    //       event.users.filter((u) => u.worker),
    //       event.capacityWorker,
    //     );

    //     return [acc[0] + (timeToFill ?? 0), acc[1] + (timeToFillWorker ?? 0)];
    //   },
    //   [0, 0],
    // );

    // return {
    //   totalEvents,
    //   totalEventsActive,
    //   timeToFillHours: (totalTimeToFill[0] / totalEvents).toFixed(2) || 0,
    //   timeToFillWorkerHours: (totalTimeToFill[1] / totalEvents).toFixed(2) || 0,
    //   eventsInCurrentQuarter,
    // };
    return {};
  }

  async findAll(filters?: Partial<EventDto>) {
    const events = await this.prisma.event.findMany({
      where: {
        name: { contains: filters?.name || undefined },
      },
      select: {
        id: true,
        type: true,
        name: true,
        startDate: true,
        isActive: true,
        registrationTypes: {
          select: {
            description: true,
            capacity: true,
            _count: {
              select: {
                users: true,
              },
            },
          },
        },
        _count: {
          select: {
            bedrooms: true,
            Team: true,
          },
        },
      },
    });

    return events;
  }

  async findOne(id: string) {
    return await this.prisma.event
      .findFirst({
        where: { id },
        include: {
          users: {
            select: {
              user: true,
              payment: true,
              registrationType: true,
              discount: true,
            },
          },
        },
      })
      .then((event) => this.handlerReturnEvent(event));
  }

  async update(id: string, updateEvent: EventDto) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        registrationTypes: {
          include: { _count: { select: { users: true } } },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event does not exists!');
    }

    const startDate = new Date(updateEvent.startDate);
    const endDate = new Date(updateEvent.endDate);

    await this.prisma.$transaction(async (tx) => {
      // 1️⃣ Atualiza dados do evento
      await tx.event.update({
        where: { id },
        data: {
          name: updateEvent.name,
          startDate,
          endDate,
          isActive: updateEvent.isActive,
          groupLink: updateEvent.groupLink,
        },
      });

      if (!updateEvent.registrationTypes) return;

      const existing = event.registrationTypes;

      const incomingIds = updateEvent.registrationTypes
        .filter((rt) => rt.id)
        .map((rt) => rt.id);

      // 2️⃣ Remover tipos que não vieram mais
      for (const rt of existing) {
        if (!incomingIds.includes(rt.id)) {
          if (rt._count.users > 0) {
            throw new BadRequestException(
              `Registration type "${rt.description}" has users and cannot be removed`,
            );
          }

          await tx.registrationTypes.delete({
            where: { id: rt.id },
          });
        }
      }

      // 3️⃣ Criar / Atualizar
      for (const rt of updateEvent.registrationTypes) {
        if (rt.id) {
          await tx.registrationTypes.update({
            where: { id: rt.id },
            data: {
              description: rt.description,
              price: rt.price,
              capacity: rt.capacity,
            },
          });
        } else {
          await tx.registrationTypes.create({
            data: {
              eventId: id,
              description: rt.description,
              price: rt.price,
              capacity: rt.capacity,
            },
          });
        }
      }
    });
  }

  async removeUserFromEvent(idUser: string, idEvent: string) {
    const userExists = await this.prisma.user.findUnique({
      where: {
        id: idUser,
      },
    });

    if (!userExists) {
      throw new NotFoundException('User does not exists!');
    }

    const eventExists = await this.prisma.event.findUnique({
      where: {
        id: idEvent,
      },
    });

    if (!eventExists) {
      throw new NotFoundException('Event does not exists!');
    }

    await this.removeRelation(idUser, idEvent);
  }

  async remove(id: string) {
    const eventExists = await this.prisma.event.findUnique({
      where: {
        id,
      },
    });

    if (!eventExists) {
      throw new NotFoundException('Event does not exists!');
    }

    await this.prisma.event.delete({ where: { id } }).catch(() => {
      throw new InternalServerErrorException();
    });
  }
  async findUsers(idEvent: string) {
    return this.prisma.user
      .findMany({
        where: {
          events: {
            some: {
              eventId: idEvent,
            },
          },
        },
        include: {
          events: {
            select: {
              eventId: true,
              payment: true,
              registrationType: true,
            },
          },
          bedrooms: {
            select: {
              bedrooms: {
                select: {
                  name: true,
                  id: true,
                  eventId: true,
                },
              },
            },
          },

          TeamOnUsers: {
            select: {
              team: {
                select: {
                  name: true,
                  id: true,
                  eventId: true,
                },
              },
            },
          },
        },
      })
      .then((users) => this.handleReturnUsersByEvent(users, idEvent));
  }
  async findUsersInWaitlist(idEvent: string) {
    return this.prisma.waitlist.findMany({
      where: {
        eventId: idEvent,
      },
      include: {
        user: true,
        registrationType: true,
      },
    });
  }
  async removeUserFromWaitlist(idUser: string, idEvent: string) {
    const waitlistEntry = await this.prisma.waitlist.findFirst({
      where: { userId: idUser, eventId: idEvent },
    });

    if (!waitlistEntry) {
      throw new NotFoundException('Waitlist entry does not exist!');
    }

    await this.prisma.waitlist
      .delete({
        where: { id: waitlistEntry.id },
      })
      .catch(() => {
        throw new InternalServerErrorException();
      });
  }
  async movedUserFromWaitlistToEvent(userId: string, eventId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const waitlistEntry = await tx.waitlist.findFirst({
        where: { userId, eventId },
      });

      if (!waitlistEntry) {
        throw new NotFoundException('Waitlist entry does not exist!');
      }

      const registration = await this.registerUserInEvent(
        userId,
        eventId,
        waitlistEntry.registrationTypeId,
        tx,
      );

      await tx.waitlist.delete({
        where: { id: waitlistEntry.id },
      });

      return registration;
    });
  }
}
