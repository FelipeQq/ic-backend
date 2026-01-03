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
    roleRegistrationId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = tx ?? this.prisma;

    const result = tx
      ? await this._registerUserInEventTx(
          prisma,
          userId,
          eventId,
          roleRegistrationId,
        )
      : await this.prisma.$transaction(async (trx) =>
          this._registerUserInEventTx(trx, userId, eventId, roleRegistrationId),
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
    roleRegistrationId: string,
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
    WHERE id = ${roleRegistrationId}
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
    WHERE "roleRegistrationId" = ${roleRegistrationId}
    FOR UPDATE
  `;

    const count = await tx.eventOnUsers.count({
      where: { roleRegistrationId },
    });

    if (
      registrationType.capacity !== null &&
      count >= registrationType.capacity
    ) {
      return {
        type: 'WAITLIST',
        data: await tx.waitlist.create({
          data: { userId, eventId, roleRegistrationId },
        }),
        user,
        event,
      };
    }

    return {
      type: 'REGISTERED',
      data: await tx.eventOnUsers.create({
        data: { userId, eventId, roleRegistrationId },
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
    data: { roleRegistrationId?: string },
  ) {
    if (!data.roleRegistrationId) {
      throw new BadRequestException('New registration type is required');
    }

    return await this.prisma.$transaction(async (tx) => {
      const relation = await tx.eventOnUsers.findUnique({
        where: {
          userId_eventId: { userId, eventId },
        },
        include: {
          rolesRegistration: {
            include: { group: true },
          },
        },
      });

      if (!relation) {
        throw new NotFoundException('User is not registered in this event');
      }

      // Busca o novo tipo de inscrição (e garante que pertence ao evento)
      const newRegistrationType = await tx.rolesRegistration.findFirst({
        where: {
          id: data.roleRegistrationId,
          group: { eventId },
        },
        include: {
          _count: { select: { EventOnUsers: true } },
          group: { select: { capacity: true } },
        },
      });

      if (!newRegistrationType) {
        throw new NotFoundException(
          'Registration type does not belong to this event',
        );
      }

      // Valida capacidade
      if (
        newRegistrationType.group.capacity !== null &&
        newRegistrationType._count.EventOnUsers >=
          newRegistrationType.group.capacity
      ) {
        throw new BadRequestException(
          'Registration type capacity has already been reached',
        );
      }

      //  Evita update inútil
      if (relation.roleRegistrationId === newRegistrationType.id) {
        return relation;
      }

      //  Atualiza relação
      return await tx.eventOnUsers.update({
        where: {
          userId_eventId: { userId, eventId },
        },
        data: {
          roleRegistrationId: newRegistrationType.id,
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
          type: data.type,
          endDate: data.endDate,
          startDate: data.startDate,
          name: data.name,
          data: data.data as Prisma.JsonObject,
          groupRoles: {
            create: data.groupRoles?.map((gr) => ({
              name: gr.name,
              capacity: gr.capacity,
              group: {
                create: gr.roles.map((r) => ({
                  price: r.price,
                })),
              },
            })),
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
        groupRoles: {
          select: {
            name: true,
            capacity: true,
            roles: {
              select: {
                id: true,
                _count: {
                  select: { EventOnUsers: true },
                },
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
              discount: true,
            },
          },
          groupRoles: {
            include: {
              roles: true,
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
        groupRoles: {
          include: {
            roles: {
              include: {
                _count: { select: { EventOnUsers: true } },
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event does not exist');
    }

    const startDate = new Date(updateEvent.startDate);
    const endDate = new Date(updateEvent.endDate);

    await this.prisma.$transaction(async (tx) => {
      /** 1️⃣ Atualiza dados básicos do evento */
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

      if (!updateEvent.groupRoles?.length) return;

      const existingRoles = event.groupRoles.flatMap((g) => g.roles);

      const incomingIds = updateEvent.groupRoles
        .filter((rt) => rt.id)
        .map((rt) => rt.id);

      /** 2️⃣ Remove roles que não vieram mais */
      for (const role of existingRoles) {
        if (!incomingIds.includes(role.id)) {
          if (role._count.EventOnUsers > 0) {
            throw new BadRequestException(
              `Registration type "${role.description}" already has users and cannot be removed`,
            );
          }

          await tx.rolesRegistration.delete({
            where: { id: role.id },
          });
        }
      }

      /** 3️⃣ Cria ou atualiza roles */
      for (const rt of existingRoles) {
        if (rt.id) {
          await tx.rolesRegistration.update({
            where: { id: rt.id },
            data: {
              description: rt.description,
              price: rt.price,
            },
          });
        } else {
          await tx.rolesRegistration.create({
            data: {
              description: rt.description,
              price: rt.price,
              groupId: rt.groupId,
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
              rolesRegistration: {
                select: {
                  description: true,
                  group: { select: { name: true } },
                },
              },
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
        rolesRegistration: {
          select: { price: true, group: { select: { name: true } } },
        },
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
        waitlistEntry.roleRegistrationId,
        tx,
      );

      await tx.waitlist.delete({
        where: { id: waitlistEntry.id },
      });

      return registration;
    });
  }
}
