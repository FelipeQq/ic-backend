import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService, TeamRole } from '../prisma';
import { TeammDto } from './dto/team.dto';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  async createRelations(
    usersLeadersIds: string[],
    usersIds: string[],
    idTeam: string,
  ) {
    const membersToAdd = usersIds.map((id) => ({
      userId: id,
      teamId: idTeam,
      role: TeamRole.MEMBER,
    }));

    const leadersToAdd = usersLeadersIds.map((id) => ({
      userId: id,
      teamId: idTeam,
      role: TeamRole.LEADER,
    }));

    // prioridade para role de lider caso o usuario esteja nas duas listas
    const uniqueUsers = Array.from(
      new Map(
        [...membersToAdd, ...leadersToAdd].map((item) => [item.userId, item]),
      ).values(),
    );

    // upsert para criar ou atualizar role
    await this.prisma
      .$transaction(
        uniqueUsers.map((user) =>
          this.prisma.teamOnUsers.upsert({
            where: {
              userId_teamId: { userId: user.userId, teamId: user.teamId },
            },
            create: user,
            update: { role: user.role },
          }),
        ),
      )
      .catch(() => {
        throw new InternalServerErrorException();
      });
  }

  async create(idEvent: string, createTeam: TeammDto) {
    try {
      const team = await this.prisma.team.create({
        data: {
          eventId: idEvent,
          name: createTeam.name,
          note: createTeam.note,
          capacity: createTeam.capacity,
        },
      });

      await this.createRelations(
        createTeam.usersLeadersId,
        createTeam.usersId,
        team.id,
      );
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async findAll(eventId: string) {
    return await this.prisma.team
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
              role: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  profilePhotoUrl: true,
                  cellphone: true,
                  birthday: true,
                  email: true,
                },
              },
            },
          },
        },
      })
      .then((teams) =>
        teams.map((team) => ({
          ...team,
          users: team.users.map((e) => ({ ...e.user, roleTeam: e.role })),
        })),
      );
  }

  async findOne(id: string) {
    return await this.prisma.team
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
              role: true,
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
      .then((team) => ({
        ...team,
        users: team.users.map((e) => ({ ...e.user, roleTeam: e.role })),
      }));
  }

  async update(idEvent: string, idTeam: string, updateTeamDto: TeammDto) {
    try {
      const teamExist = await this.prisma.team.findUnique({
        where: {
          id: idTeam,
        },
      });

      if (!teamExist) {
        throw new NotFoundException('Team does not exists!');
      }

      await this.prisma.teamOnUsers.deleteMany({
        where: {
          teamId: idTeam,
          NOT: {
            userId: {
              in: [...updateTeamDto.usersId, ...updateTeamDto.usersLeadersId],
            },
          },
        },
      });

      const team = await this.prisma.team.update({
        data: {
          eventId: idEvent,
          name: updateTeamDto.name,
          note: updateTeamDto.note,
          capacity: updateTeamDto.capacity,
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
      });
      await this.createRelations(
        updateTeamDto.usersLeadersId,
        updateTeamDto.usersId,
        team.id,
      );
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async delete(teamId: string) {
    const bedroomExist = await this.prisma.team.findUnique({
      where: {
        id: teamId,
      },
    });

    if (!bedroomExist) {
      throw new NotFoundException('Team does not exist!');
    }

    // Delete relations
    await this.prisma.teamOnUsers.deleteMany({
      where: {
        teamId,
      },
    });

    // Deleta bedroom
    await this.prisma.team.delete({
      where: {
        id: teamId,
      },
    });
  }
}
