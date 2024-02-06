import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { TeammDto } from './dto/team.dto';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  async createRelations(usersIds: string[], idTeam: string) {
    const existRelation = await this.prisma.teamOnUsers.findMany({
      where: { userId: { in: usersIds }, teamId: idTeam },
    });

    const getUsersId = existRelation.map((e) => e.userId);

    const filterIds = usersIds.filter((id) => !getUsersId.includes(id));

    if (filterIds.length > 0) {
      await this.prisma.teamOnUsers.createMany({
        data: filterIds.map((id: string) => {
          return { userId: id, teamId: idTeam };
        }),
      });
    }
  }

  async create(idEvent: string, createTeam: TeammDto) {
    try {
      await this.prisma.team
        .create({
          data: {
            eventId: idEvent,
            name: createTeam.name,
          },
        })
        .then((team) => {
          this.createRelations(createTeam.usersId, team.id);
        });
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async findAll() {
    return await this.prisma.team.findMany({
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

  async findOne(id: string) {
    return await this.prisma.team.findFirst({
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

  async update(idEvent: string, idTeam: string, updateTeamDto: TeammDto) {
    const teamExist = await this.prisma.team.findUnique({
      where: {
        id: idTeam,
      },
    });

    if (!teamExist) {
      throw new NotFoundException('Team does not exists!');
    }

    await this.prisma.team
      .update({
        data: {
          eventId: idEvent,
          name: updateTeamDto.name,
        },
        where: {
          id: idTeam,
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
        this.createRelations(updateTeamDto.usersId, idTeam);
      })
      .catch(() => {
        throw new InternalServerErrorException();
      });
  }

  remove(id: string) {
    return `This action removes a #${id} team`;
  }
}
