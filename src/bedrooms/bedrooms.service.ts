import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { BedroomDto } from './dto/bedroom.dto';

@Injectable()
export class BedroomsService {
  constructor(private prisma: PrismaService) {}

  async createRelations(usersIds: string[], idBedroom: string) {
    const existRelation = await this.prisma.bedroomsOnUsers.findMany({
      where: { userId: { in: usersIds }, bedroomsId: idBedroom },
    });

    const getUsersId = existRelation.map((e) => e.userId);

    const filterIds = usersIds.filter((id) => !getUsersId.includes(id));

    if (filterIds.length > 0) {
      await this.prisma.bedroomsOnUsers.createMany({
        data: filterIds.map((id: string) => {
          return { userId: id, bedroomsId: idBedroom };
        }),
      });
    }
  }

  async create(idEvent: string, createBedroom: BedroomDto) {
    try {
      await this.prisma.bedrooms
        .create({
          data: {
            eventId: idEvent,
            note: createBedroom.note,
            name: createBedroom.name,
            capacity: createBedroom.capacity,
            tag: createBedroom.tags,
          },
        })
        .then((bedroom) => {
          this.createRelations(createBedroom.usersId, bedroom.id);
        });
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async findAll(eventId: string) {
    return await this.prisma.bedrooms
      .findMany({
        where: {
          eventId,
        },
        include: {
          event: {
            select: {
              id: true,
              name: true,
            },
          },
          users: {
            select: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  profilePhotoUrl: true,
                },
              },
            },
          },
        },
      })
      .then((bedrooms) =>
        bedrooms.map((bedroom) => ({
          ...bedroom,
          users: bedroom.users.map((e) => e.user),
        })),
      );
  }

  async findOne(id: string) {
    return await this.prisma.bedrooms
      .findFirst({
        where: { id },
        include: {
          event: {
            select: {
              id: true,
              name: true,
            },
          },
          users: {
            select: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },
        },
      })
      .then((bedrooms) => ({
        ...bedrooms,
        users: bedrooms?.users?.map((e) => e.user),
      }));
  }

  async update(
    idEvent: string,
    idBedroom: string,
    updateBedroomDto: BedroomDto,
  ) {
    const bedroomExist = await this.prisma.bedrooms.findUnique({
      where: {
        id: idBedroom,
      },
    });

    if (!bedroomExist) {
      throw new NotFoundException('Bedroom does not exists!');
    }

    // Remove relations for users that are not in the updated list
    await this.prisma.bedroomsOnUsers.deleteMany({
      where: {
        bedroomsId: idBedroom,
        NOT: {
          userId: {
            in: updateBedroomDto.usersId,
          },
        },
      },
    });

    // Update the bedroom
    await this.prisma.bedrooms.update({
      data: {
        eventId: idEvent,
        note: updateBedroomDto.note,
        name: updateBedroomDto.name,
        capacity: updateBedroomDto.capacity,
        tag: updateBedroomDto.tags,
      },
      where: {
        id: idBedroom,
      },
    });

    // Create relations for new users
    await this.createRelations(updateBedroomDto.usersId, idBedroom);
  }

  async delete(idBedroom: string) {
    const bedroomExist = await this.prisma.bedrooms.findUnique({
      where: {
        id: idBedroom,
      },
    });

    if (!bedroomExist) {
      throw new NotFoundException('Bedroom does not exist!');
    }

    // Delete relations
    await this.prisma.bedroomsOnUsers.deleteMany({
      where: {
        bedroomsId: idBedroom,
      },
    });

    // Deleta bedroom
    await this.prisma.bedrooms.delete({
      where: {
        id: idBedroom,
      },
    });
  }
}
