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

  create(data: EventDto) {
    try {
      data.endDate = new Date(data.endDate);
      data.startDate = new Date(data.startDate);

      this.prisma.event.create({
        data,
      });
    } catch {
      throw new InternalServerErrorException();
    }
  }

  findAll() {
    return this.prisma.event.findMany();
  }

  findOne(id: number) {
    return this.prisma.event.findFirst({ where: { id } });
  }

  update(id: number, updateEvent: EventDto) {
    const eventExists = this.prisma.event.findUnique({
      where: {
        id: +id,
      },
    });

    if (!eventExists) {
      throw new NotFoundException('Event does not exists!');
    }

    try {
      this.prisma.event.update({
        data: updateEvent,
        where: {
          id: +id,
        },
      });
    } catch {
      throw new InternalServerErrorException();
    }
  }

  remove(id: number) {
    const eventExists = this.prisma.event.findUnique({
      where: {
        id: +id,
      },
    });

    if (!eventExists) {
      throw new NotFoundException('Event does not exists!');
    }

    try {
      this.prisma.event.delete({ where: { id: +id } });
    } catch {
      throw new InternalServerErrorException();
    }
  }
}
