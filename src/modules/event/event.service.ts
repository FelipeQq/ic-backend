import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { EventDto } from './event.dto';

@Injectable()
export class EventService {
  constructor(private prisma: PrismaService) {}

  async createRelations(usersIds: number[], idEvent: number) {
    const existRelation = await this.prisma.eventOnUsers.findMany({
      where: { userId: { in: usersIds }, eventId: idEvent },
    });

    const getUsersId = existRelation.map((e) => e.userId);

    const filterIds = usersIds.filter((id) => !getUsersId.includes(id));

    if (filterIds.length > 0) {
      await this.prisma.eventOnUsers.createMany({
        data: filterIds.map((id: number) => {
          return { userId: id, eventId: idEvent };
        }),
      });
    }
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

  async findAll() {
    const events = await this.prisma.event.findMany();

    const adjustedEvents = await Promise.all(
      events.map(async (event) => {
        const userAssociations = await this.prisma.eventOnUsers.findMany({
          where: {
            eventId: event.id,
          },
          select: {
            userId: true,
          },
        });

        const userIds = userAssociations.map(
          (association) => association.userId,
        );

        const users = await this.prisma.user.findMany({
          where: {
            id: {
              in: userIds,
            },
          },
          select: {
            email: true,
            fullName: true,
            profilePhotoUrl: true,
          },
        });

        return {
          ...event,
          users: users.map((user) => ({
            email: user.email,
            fullName: user.fullName,
            profilePhotoUrl: user.profilePhotoUrl,
          })),
        };
      }),
    );

    return adjustedEvents;
  }

  async findOne(id: number) {
    return await this.prisma.event.findFirst({
      where: { id },
      include: {
        users: {
          select: {
            user: true,
          },
        },
      },
    });
  }

  async update(id: number, updateEvent: EventDto) {
    const eventExists = await this.prisma.event.findUnique({
      where: {
        id: +id,
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
          id: +id,
        },
        include: {
          users: {
            select: {
              user: true,
            },
          },
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

  async remove(id: number) {
    const eventExists = await this.prisma.event.findUnique({
      where: {
        id: +id,
      },
    });

    if (!eventExists) {
      throw new NotFoundException('Event does not exists!');
    }

    await this.prisma.event.delete({ where: { id: +id } }).catch(() => {
      throw new InternalServerErrorException();
    });
  }
}
