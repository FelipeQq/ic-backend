import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { BedroomDto } from './bedroom.dto';

@Injectable()
export class BedroomsService {
  constructor(private prisma: PrismaService) {}

  async createRelations(usersIds: number[], idBedroom: number) {
    const existRelation = await this.prisma.bedroomsOnUsers.findMany({
      where: { userId: { in: usersIds }, bedroomsId: idBedroom },
    });

    const getUsersId = existRelation.map((e) => e.userId);

    const filterIds = usersIds.filter((id) => !getUsersId.includes(id));

    if (filterIds.length > 0) {
      await this.prisma.bedroomsOnUsers.createMany({
        data: filterIds.map((id: number) => {
          return { userId: id, bedroomsId: idBedroom };
        }),
      });
    }
  }

  async create(idEvent: number, createBedroom: BedroomDto) {
    try {
      await this.prisma.bedrooms
        .create({
          data: {
            eventId: idEvent,
            note: createBedroom.note,
          },
        })
        .then((bedroom) => {
          this.createRelations(createBedroom.usersId, bedroom.id);
        });
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async findAll() {
    return await this.prisma.bedrooms.findMany({
      include: {
        event: true,
        users: {
          select: {
            user: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    return await this.prisma.bedrooms.findFirst({
      where: { id },
      include: {
        event: true,
        users: {
          select: {
            user: true,
          },
        },
      },
    });
  }

  async update(
    idEvent: number,
    idBedroom: number,
    updateBedroomDto: BedroomDto,
  ) {
    const bedroomExist = await this.prisma.bedrooms.findUnique({
      where: {
        id: +idBedroom,
      },
    });

    if (!bedroomExist) {
      throw new NotFoundException('Bedroom does not exists!');
    }

    await this.prisma.bedrooms
      .update({
        data: {
          eventId: idEvent,
          note: updateBedroomDto.note,
        },
        where: {
          id: +idBedroom,
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
        this.createRelations(updateBedroomDto.usersId, idBedroom);
      })
      .catch(() => {
        throw new InternalServerErrorException();
      });
  }

  remove(id: number) {
    return `This action removes a #${id} bedroom`;
  }
}
