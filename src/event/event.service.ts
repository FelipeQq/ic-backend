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

  private handlerReturnEvent(event) {
    function transformData(event) {
      const formattedUsers = event.users.map((user) => ({
        ...user.user,
        paid: user.paid || false,
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

  async findAll(filters?: Partial<EventDto>) {
    return await this.prisma.event
      .findMany({
        where: {
          name: { contains: filters?.name || undefined },
        },
        include: {
          users: {
            select: {
              user: true,
              paid: true,
            },
          },
        },
      })
      .then((events) => this.handlerReturnEvent(events));
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
}
