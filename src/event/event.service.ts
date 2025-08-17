import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { EventDto } from './dto/event.dto';

@Injectable()
export class EventService {
  constructor(private prisma: PrismaService) {}

  async createRelations(usersIds: string[], idEvent: string) {
    const existRelation = await this.prisma.eventOnUsers.findMany({
      where: { userId: { in: usersIds }, eventId: idEvent },
    });

    const getUsersId = existRelation.map((e) => e.userId);

    const filterIds = usersIds.filter((id) => !getUsersId.includes(id));

    if (filterIds.length > 0) {
      await this.prisma.eventOnUsers.createMany({
        data: filterIds.map((id: string) => {
          return { userId: id, eventId: idEvent, paid: false };
        }),
      });
    }
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
    idUser: string,
    idEvent: string,
    data: { worker: boolean },
  ) {
    const relationExists = await this.prisma.eventOnUsers.findFirst({
      where: { userId: idUser, eventId: idEvent },
    });
    if (!relationExists) {
      throw new NotFoundException('Relation does not exists!');
    }
    if (data.worker === undefined) {
      throw new NotFoundException('Worker data is required!');
    }
    const worker = data.worker;
    const eventOnUsers = await this.prisma.eventOnUsers.update({
      where: { userId_eventId: { userId: idUser, eventId: idEvent } },
      data: {
        worker,
        // paid: relationExists.paid ? false : true,
      },
    });
    return eventOnUsers;
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

      await this.prisma.event
        .create({
          data: {
            endDate: data.endDate,
            startDate: data.startDate,
            name: data.name,
            price: data.price,
            workerPrice: data.workerPrice,
            capacity: data.capacity,
            capacityWorker: data.capacityWorker,
            isActive: true,
          },
        })
        .then((event) => {
          if (data.users) {
            this.createRelations(data.users, event.id);
          }
        });
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async findInsightsEvents() {
    const events = await this.prisma.event.findMany({
      select: {
        isActive: true,
        id: true,
        name: true,
        startDate: true,
        users: {
          select: {
            createdAt: true, // precisa estar no select para calcular
          },
        },
      }, // caso use TS, pois não existe "createdAt" no include, é no select
    });

    //calcular a media de ventos por trimestre
    const trimestres = [0, 0, 0, 0]; // índice 0 = 1º tri, 1 = 2º tri...

    events.forEach((event) => {
      const eventDate = new Date(event.startDate);
      const quarter = Math.floor(eventDate.getMonth() / 3); // 0–3
      trimestres[quarter]++;
    });

    // Soma total de eventos e divide por 4 trimestres
    const totalEventos = trimestres.reduce((acc, val) => acc + val, 0);
    const eventsInCurrentQuarter = totalEventos / 4;

    // Calcula o tempo médio para lotar por evento individual
    const totalEventsActive = events.filter((e) => e.isActive).length;
    const totalEvents = events.length;
    const totalTimeToFill = events.reduce((acc, event) => {
      if (event.users.length > 0) {
        const timeToFill =
          event.users[event.users.length - 1].createdAt.getTime() -
          event.users[0].createdAt.getTime();
        return acc + timeToFill / (1000 * 60 * 60); // converte para horas
      }
      return acc;
    }, 0);

    return {
      totalEvents,
      totalEventsActive,
      timeToFillHours: (totalTimeToFill / totalEvents).toFixed(2) || 0,
      eventsInCurrentQuarter,
    };
  }

  async findAll(filters?: Partial<EventDto>) {
    return await this.prisma.event.findMany({
      where: {
        name: { contains: filters?.name || undefined },
      },
      include: {
        users: {
          select: {
            userId: true,
            worker: true,
            paid: true,
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
    //.then((events) => this.handlerReturnEvent(events));
  }

  async findOne(id: string) {
    return await this.prisma.event
      .findFirst({
        where: { id },
        include: {
          users: {
            select: {
              user: true,
              paid: true,
              worker: true,
            },
          },
        },
      })
      .then((event) => this.handlerReturnEvent(event));
  }

  async update(id: string, updateEvent: EventDto) {
    const eventExists = await this.prisma.event.findUnique({
      where: {
        id,
      },
    });

    if (!eventExists) {
      throw new NotFoundException('Event does not exists!');
    }

    updateEvent.endDate = new Date(updateEvent.endDate);
    updateEvent.startDate = new Date(updateEvent.startDate);

    await this.prisma.event
      .update({
        data: {
          endDate: updateEvent.endDate,
          startDate: updateEvent.startDate,
          name: updateEvent.name,
          price: updateEvent.price,
        },
        where: {
          id,
        },
      })
      .then(() => {
        if (updateEvent.users) {
          this.createRelations(updateEvent.users, id);
        }
      })
      .catch(() => {
        throw new InternalServerErrorException();
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
              paid: true,
              worker: true,
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
}
