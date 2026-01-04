import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Event, Prisma, PrismaService } from '../prisma';
import { EventDto } from './dto/event.dto';
import { enviarEmailConfirmacao } from 'src/nodeMailer/sendEmail';

@Injectable()
export class EventService {
  constructor(private prisma: PrismaService) {}

  async registerUserInEvent(
    userId: string,
    eventId: string,
    registrationRoleIds: string[],
    options?: {
      tx?: Prisma.TransactionClient;
      attempt?: number;
    },
  ) {
    const MAX_RETRIES = 2;
    const tx = options?.tx;
    const attempt = options?.attempt ?? 1;

    try {
      const result = tx
        ? await this._registerUserInEventTx(
            tx,
            userId,
            eventId,
            registrationRoleIds,
          )
        : await this.prisma.$transaction(
            async (trx) =>
              this._registerUserInEventTx(
                trx,
                userId,
                eventId,
                registrationRoleIds,
              ),
            { isolationLevel: 'Serializable' },
          );

      await enviarEmailConfirmacao(
        result.user.fullName,
        result.user.email,
        false,
        result.event.name,
        result.event.startDate,
        result.event.endDate,
      );

      return result.results;
    } catch (error: any) {
      //  retry apenas para conflito de serialização
      if (error?.code === '40001' && attempt <= MAX_RETRIES) {
        return this.registerUserInEvent(userId, eventId, registrationRoleIds, {
          attempt: attempt + 1,
          tx,
        });
      }
      throw error;
    }
  }

  private async _registerUserInEventTx(
    tx: PrismaService | Prisma.TransactionClient,
    userId: string,
    eventId: string,
    registrationRoleIds: string[],
  ) {
    //-------------------------- verificações iniciais --------------------------//
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    // Para verifica se incrição ja existe precisa verificar se a roles ja estao registradas
    const existingRoles = await tx.eventOnUsersRolesRegistration.findMany({
      where: {
        userId,
        eventId,
        roleRegistrationId: { in: registrationRoleIds },
      },
    });
    //verifica se ja esta registrado no evento
    const alreadyRegistered = await tx.eventOnUsers.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });

    if (existingRoles.length > 0 && alreadyRegistered) {
      throw new BadRequestException(
        'User already registered with some roles in event ',
      );
    }

    //para verifica na waitlist
    const existingWaitlist = await tx.waitlist.findMany({
      where: {
        userId,
        eventId,
        roleRegistrationId: { in: registrationRoleIds },
      },
    });

    if (existingWaitlist.length > 0) {
      throw new BadRequestException(
        'User already in waitlist for some roles in event',
      );
    }
    //--------------------------- regra de inscrição ---------------------------//

    /** Regra: roles devem existir e ser de grupos diferentes */
    const roles = await tx.rolesRegistration.findMany({
      where: {
        id: { in: registrationRoleIds },
        group: {
          eventId,
        },
      },
      include: { group: true },
    });

    if (roles.length !== registrationRoleIds.length) {
      throw new BadRequestException('Invalid role(s)');
    }

    const groupIds = roles.map((r) => r.groupId);
    if (new Set(groupIds).size !== roles.length) {
      throw new BadRequestException('Roles must belong to different groups');
    }

    //-------------------------- realiza inscrição --------------------------//

    const results = [];
    //Processa role por role */;
    for (const role of roles) {
      //verifica capacidade do grupo */
      const count = await tx.eventOnUsersRolesRegistration.count({
        where: {
          role: {
            groupId: role.groupId,
          },
          eventId,
        },
      });

      if (role.group.capacity !== null && count >= role.group.capacity) {
        // caso esteja cheio, coloca na waitlist
        const waitlist = await tx.waitlist.create({
          data: {
            userId,
            eventId,
            roleRegistrationId: role.id,
          },
        });

        results.push({ roleId: role.id, type: 'WAITLIST', data: waitlist });
        continue;
      }

      //caso tenha vaga, registra no evento e cria um role de inscrição */

      await tx.eventOnUsers.upsert({
        where: { userId_eventId: { userId, eventId } },
        update: {},
        create: { userId, eventId },
      });

      const registration = await tx.eventOnUsersRolesRegistration.create({
        data: {
          userId,
          eventId,
          roleRegistrationId: role.id,
        },
      });

      results.push({ roleId: role.id, type: 'REGISTERED', data: registration });
    }

    return { user, event, results };
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
      .catch((err) => {
        throw new InternalServerErrorException();
      });
  }

  async updateUserFromEvent(
    userId: string,
    eventId: string,
    registrationRoleId: string[],
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const relation = await tx.eventOnUsers.findUnique({
          where: { userId_eventId: { userId, eventId } },
        });

        if (!relation) {
          throw new NotFoundException('User not registered in event');
        }

        await tx.eventOnUsers.deleteMany({
          where: { userId, eventId },
        });

        // reaproveita regra de inscrição
        const result = await this._registerUserInEventTx(
          tx,
          userId,
          eventId,
          registrationRoleId,
        );

        return result.results;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  private handlerReturnAllEvents(events: any[]) {
    function transformData(events: Event[]) {
      return events.map((event: any) => {
        const data = {
          ...event,
          bedroom: event._count.bedrooms,
          team: event._count.Team,
          groupRoles: event.groupRoles.map((group: any) => ({
            name: group.name,
            capacity: group.capacity,
            roles: group.roles.map((role: any) => ({
              id: role.id,
              description: role.description,
              registeredCount: role._count.EventOnUsers,
            })),
          })),
        };
        delete data._count;
        return data;
      });
    }
    return transformData(events);
  }

  private handleformatUsers(data: any[]) {
    return data.map((item) => {
      /** 🔹 Agrupa roles por grupo */
      const groupsMap = new Map<string, any>();

      for (const rr of item.rolesRegistration) {
        const role = rr.role;
        const group = role.group;

        if (!groupsMap.has(group.id)) {
          groupsMap.set(group.id, {
            id: group.id,
            name: group.name,
            roles: [],
          });
        }

        groupsMap.get(group.id).roles.push({
          id: role.id,
          description: role.description,
          price: role.price,
        });
      }

      /** 🔹 Quartos */
      const bedrooms = item.user.bedrooms.map((b) => ({
        id: b.bedrooms.id,
        name: b.bedrooms.name,
        capacity: b.bedrooms.capacity,
      }));

      /** 🔹 Times */
      const teams = item.user.TeamOnUsers.map((t) => ({
        id: t.team.id,
        name: t.team.name,
        capacity: t.team.capacity,
      }));

      return {
        user: {
          id: item.user.id,
          fullName: item.user.fullName,
          email: item.user.email,
          cpf: item.user.cpf,
          cellphone: item.user.cellphone,
        },
        groupsRegistration: Array.from(groupsMap.values()),
        bedrooms,
        teams,
      };
    });
  }

  async create(data: EventDto) {
    try {
      data.endDate = new Date(data.endDate);
      data.startDate = new Date(data.startDate);

      const event = await this.prisma.event.create({
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
              roles: {
                create: gr.roles.map((r) => ({
                  price: r.price,
                  description: r.description,
                })),
              },
            })),
          },
          groupLink: data.groupLink,
          isActive: true,
        },
      });
      return event;
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
    const events = await this.prisma.event
      .findMany({
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
                  description: true,
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
      })
      .then((events) => this.handlerReturnAllEvents(events));

    return events;
  }

  async findOne(id: string) {
    return await this.prisma.event.findFirst({
      where: { id },
      include: {
        users: {
          select: {
            user: true,
          },
        },
        groupRoles: {
          include: {
            roles: true,
          },
        },
      },
    });
    //.then((event) => this.handlerReturnEvent(event));
  }
  async findOneClear(id: string) {
    return await this.prisma.event.findFirst({
      where: { id },
      include: {
        groupRoles: {
          include: {
            roles: true,
          },
        },
      },
    });
    //.then((event) => this.handlerReturnEvent(event));
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
      /**Atualiza dados básicos do evento */
      await tx.event.update({
        where: { id },
        data: {
          type: updateEvent.type,
          name: updateEvent.name,
          startDate,
          data: updateEvent.data as Prisma.JsonObject,
          endDate,
          isActive: updateEvent.isActive,
          groupLink: updateEvent.groupLink,
        },
      });

      if (!updateEvent.groupRoles?.length) return;

      const dbGroups = new Map(event.groupRoles.map((g) => [g.id, g]));

      const incomingGroups = new Map(
        updateEvent.groupRoles.filter((g) => g.id).map((g) => [g.id!, g]),
      );

      //REMOVER GRUPOS AUSENTES

      for (const group of dbGroups.values()) {
        if (!incomingGroups.has(group.id)) {
          const hasUsers = group.roles.some((r) => r._count.EventOnUsers > 0);

          if (hasUsers) {
            throw new BadRequestException(
              `Group "${group.name}" has registered users and cannot be removed`,
            );
          }

          await tx.groupRoles.delete({
            where: { id: group.id },
          });
        }
      }

      //CRIAR / ATUALIZAR GRUPOS

      for (const group of updateEvent.groupRoles) {
        let groupId = group.id;

        if (groupId && dbGroups.has(groupId)) {
          // update
          await tx.groupRoles.update({
            where: { id: groupId },
            data: {
              name: group.name,
              capacity: group.capacity,
            },
          });
        } else {
          // create
          const created = await tx.groupRoles.create({
            data: {
              name: group.name,
              capacity: group.capacity,
              eventId: id,
            },
          });

          groupId = created.id;
        }

        //ROLES DO GRUPO

        const dbRoles = dbGroups.get(groupId)?.roles ?? [];

        const incomingRoles = new Map(
          group.roles.filter((r) => r.id).map((r) => [r.id!, r]),
        );

        /** REMOVER ROLES AUSENTES */
        for (const role of dbRoles) {
          if (!incomingRoles.has(role.id)) {
            if (role._count.EventOnUsers > 0) {
              throw new BadRequestException(
                `Role "${role.description}" already has users and cannot be removed`,
              );
            }

            await tx.rolesRegistration.delete({
              where: { id: role.id },
            });
          }
        }

        /** CRIAR / ATUALIZAR ROLES */
        for (const role of group.roles) {
          if (role.id) {
            await tx.rolesRegistration.update({
              where: { id: role.id },
              data: {
                description: role.description,
                price: role.price,
              },
            });
          } else {
            await tx.rolesRegistration.create({
              data: {
                description: role.description,
                price: role.price,
                groupId,
              },
            });
          }
        }
      }
    });
    return this.findOneClear(id);
  }

  async removeUserFromEvent(idUser: string, idEvent: string) {
    try {
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
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async remove(id: string) {
    try {
      const eventExists = await this.prisma.event.findUnique({
        where: {
          id,
        },
      });

      if (!eventExists) {
        throw new NotFoundException('Event does not exists!');
      }
      //verificar se há usuários inscritos
      const userCount = await this.prisma.eventOnUsers.count({
        where: {
          eventId: id,
        },
      });

      if (userCount > 0) {
        throw new BadRequestException(
          'Cannot delete event with registered users!',
        );
      }

      await this.prisma.event.delete({ where: { id } });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findUsers(eventId: string) {
    const rows = await this.prisma.eventOnUsers.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            cpf: true,
            cellphone: true,

            bedrooms: {
              where: {
                bedrooms: {
                  eventId,
                },
              },
              include: {
                bedrooms: {
                  select: {
                    id: true,
                    name: true,
                    capacity: true,
                  },
                },
              },
            },

            TeamOnUsers: {
              where: {
                team: {
                  eventId,
                },
              },
              include: {
                team: {
                  select: {
                    id: true,
                    name: true,
                    capacity: true,
                  },
                },
              },
            },
          },
        },

        rolesRegistration: {
          include: {
            role: {
              select: {
                id: true,
                description: true,
                price: true,
                group: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return this.handleformatUsers(rows);
  }

  async findUsersInWaitlist(idEvent: string) {
    return this.prisma.waitlist.findMany({
      where: {
        eventId: idEvent,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            cpf: true,
            cellphone: true,
          },
        },
        rolesRegistration: {
          select: {
            id: true,
            description: true,
            price: true,
            group: { select: { id: true, name: true } },
          },
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
        [waitlistEntry.roleRegistrationId],
        { tx },
      );

      await tx.waitlist.delete({
        where: { id: waitlistEntry.id },
      });

      return registration;
    });
  }
}
