import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as sharp from 'sharp';

import {
  Event,
  PaymentMethod,
  PaymentReceived,
  PaymentStatus,
  Prisma,
  PrismaService,
  User,
} from '../prisma';
import { EventDto } from './dto/event.dto';
import * as admin from 'firebase-admin';
import { MailService } from 'src/mail/mail.service';
import * as path from 'path';
import { uploadImageFirebase } from 'src/utils/uploadImgFirebase';

type EventWithGroupRole = Prisma.EventGetPayload<{
  include: {
    groupRoles: {
      include: {
        roles: {
          include: { _count: { select: { EventOnUsers: true } } };
        };
      };
    };
  };
}>;
@Injectable()
export class EventService {
  constructor(
    private prisma: PrismaService,
    private emailService: MailService,
  ) {}

  async registerUserInEvent(
    userId: string,
    eventId: string,
    registrationRoleIds: string[],
    options?: {
      tx?: Prisma.TransactionClient;
      attempt?: number;
      movingFromWaitlist?: boolean;
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

      if (
        options?.movingFromWaitlist === true &&
        result.results.every((r) => r.type === 'WAITLIST')
      ) {
        return result.results;
      }
      this.sendEmailConfirmation({
        user: result.user,
        event: result.event,
        tickets: result.results,
      });

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
    // 1️⃣ Verifica usuário e evento (em paralelo)
    const [user, event] = await Promise.all([
      tx.user.findUnique({ where: { id: userId } }),
      tx.event.findUnique({ where: { id: eventId } }),
    ]);

    if (!user) throw new NotFoundException('Usuario não encontrado');
    if (!event) throw new NotFoundException('Evento não encontrado');

    // 2️⃣ Busca roles solicitadas (já com grupo)
    const roles = await tx.rolesRegistration.findMany({
      where: {
        id: { in: registrationRoleIds },
        group: { eventId },
      },
      include: { group: true },
    });

    if (roles.length !== registrationRoleIds.length) {
      throw new BadRequestException('Role(s) inválido(s)');
    }

    // 3️⃣ Regra: roles devem ser de grupos diferentes
    const groupIds = roles.map((r) => r.groupId);
    if (new Set(groupIds).size !== groupIds.length) {
      throw new BadRequestException(
        'As regras devem pertencer a grupos diferentes',
      );
    }

    // 4️⃣ Busca inscrições e waitlist existentes em UMA query lógica
    const [existingRegistrations, existingWaitlist] = await Promise.all([
      tx.eventOnUsersRolesRegistration.findMany({
        where: { userId, eventId },
        select: {
          roleRegistrationId: true,
          role: { select: { groupId: true } },
        },
      }),
      tx.waitlist.findMany({
        where: {
          userId,
          eventId,
          roleRegistrationId: { in: registrationRoleIds },
        },
        select: { roleRegistrationId: true },
      }),
    ]);

    // 5️⃣ Regra: não pode repetir role
    const existingRoleIds = new Set(
      existingRegistrations.map((r) => r.roleRegistrationId),
    );

    if (registrationRoleIds.some((id) => existingRoleIds.has(id))) {
      throw new BadRequestException(
        'Usuário já registrado em grupos no evento',
      );
    }

    // 6️⃣ Regra: não pode ter dois roles do mesmo grupo no mesmo evento
    const existingGroupIds = new Set(
      existingRegistrations.map((r) => r.role.groupId),
    );

    if (roles.some((r) => existingGroupIds.has(r.groupId))) {
      throw new BadRequestException(
        'Usuário já registrado em uma regra do mesmo grupo neste evento',
      );
    }

    // 7️⃣ Regra: não pode estar na waitlist
    if (existingWaitlist.length > 0) {
      throw new BadRequestException(
        'Usuário já está na lista de espera para algumas regras de grupo no evento',
      );
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
      //verifica se ja esta registrado no grupo

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
          payment: {
            create: {
              amount: role.price,
              status:
                role.price > 0 ? PaymentStatus.WAITING : PaymentStatus.PAID,
              method: role.price > 0 ? PaymentMethod.OTHER : PaymentMethod.CASH,
              receivedFrom: PaymentReceived.SYSTEM,
            },
          },
        },
      });

      results.push({ roleId: role.id, type: 'REGISTERED', data: registration });
    }

    return { user, event, results };
  }

  private async renderTickets(tickets: any[] = []): Promise<string> {
    if (!tickets.length) return '';

    const roleIds = tickets.map((t) => t.roleId).filter(Boolean);

    const rolesRegistrations = await this.prisma.rolesRegistration.findMany({
      where: { id: { in: roleIds } },
      include: {
        group: true,
        EventOnUsers: {
          select: {
            eventOnUsers: { select: { event: { select: { data: true } } } },
          },
        },
      },
    });

    const statusMap: Record<string, string> = {
      REGISTERED: 'INSCRITO',
      WAITLIST: 'LISTA DE ESPERA',
    };

    const statusColors: Record<string, string> = {
      REGISTERED: '#16a34a',
      WAITLIST: '#ca8a04',
    };

    const items = tickets
      .map((ticket) => {
        const role = rolesRegistrations.find((r) => r.id === ticket.roleId);

        const roleName = role?.description ?? 'N/A';
        const groupName = role?.group?.name ?? 'N/A';
        const local =
          role?.EventOnUsers[0]?.eventOnUsers?.event?.data?.['localName'] ?? '';

        return `
        <li class="ticket-item">
          <div style="width:100%">
            <div class="ticket-name">
              Ingresso: ${groupName}
            </div>
            <div class="ticket-meta">
              Variação: ${roleName}
            </div>
          </div>

          <div style="text-align: right; width: 180px;position: absolute;right: 0">
            <div style="font-weight: 700; color: ${
              statusColors[ticket.type] ?? '#0f1724'
            }">
              ${statusMap[ticket.type] ?? ticket.type}
            </div>

            <div class="ticket-meta">
              Lugar: ${local}
            </div>
          </div>
        </li>
      `;
      })
      .join('');

    return `
    <ul class="ticket-list" style="margin-bottom: 16px">
      ${items}
    </ul>
  `;
  }

  private async sendEmailConfirmation({
    user,
    event,
    tickets = [],
  }: {
    user: User;
    event: Event;
    tickets?: any[];
  }) {
    const data = event.data as any;

    const LOCAL = [
      data?.localName,
      [data?.city, data?.state].filter(Boolean).join(', '),
      data?.neighborhood,
      data?.address,
    ]
      .filter(Boolean)
      .join(' - ')
      .concat(data?.zipCode ? ` - CEP: ${data.zipCode}` : '')
      .concat(data?.number ? ` - ${data.number}` : '');

    const emailData = {
      eventTitle: event.name,
      eventDescription: data?.description ?? '',
      userName: user.fullName,
      eventDate: `${new Date(
        event.startDate,
      ).toLocaleDateString()} a ${new Date(
        event.endDate,
      ).toLocaleDateString()}`,
      INSERT_TICKETS: await this.renderTickets(tickets),
      IMG_CAPA_URL: data?.coverUrl ?? '',
      IMG_LOGO_URL: data?.logoUrlInverted ?? '',
      LOCAL,
    };

    const html = this.emailService.loadTemplate(
      'registration-confirmation',
      emailData,
    );

    await this.emailService.sendMail({
      to: user.email,
      subject: `Confirmação de inscrição no evento ${event.name}`,
      html,
      attachments: [
        {
          filename: 'logo.png',
          path: path.join(
            process.cwd(),
            'src',
            'mail',
            'templates',
            'assets',
            'logo.png',
          ),
          cid: 'logo',
        },
      ],
    });
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
          throw new NotFoundException('Usuario não está registrado no evento');
        }

        await tx.eventOnUsers.deleteMany({
          where: { userId, eventId },
        });

        const registration = await this.registerUserInEvent(
          userId,
          eventId,
          registrationRoleId,
          { tx },
        );
        if (registration.some((r: any) => r.type === 'WAITLIST')) {
          // se ainda ficou na waitlist, deve falar o tx
          throw new BadRequestException(
            'Não há vagas disponíveis no evento para o grupo selecionado',
          );
        }

        return registration;
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
          waitlist: event._count.waitlist,
          users: event._count.users,
          capacity: event.groupRoles.reduce(
            (acc: number, group: any) => acc + (group.capacity || 0),
            0,
          ),
        };
        delete data._count;
        delete data.groupRoles;
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
        ...item.user,
        groupsRegistration: Array.from(groupsMap.values()),
        bedrooms,
        teams,
      };
    });
  }
  private handleformatUsersWaitlist(data: any[]) {
    return data.map((item) => {
      const rr = item.rolesRegistration;
      const role = {
        id: rr.id,
        description: rr.description,
        price: rr.price,
      };
      const group = rr.group;
      return {
        ...item.user,
        groupsRegistration: [
          {
            id: group.id,
            name: group.name,
            roles: [role],
          },
        ],
      };
    });
  }
  private handlerReturnEvent(event: EventWithGroupRole) {
    return {
      ...event,
      groupRoles: event.groupRoles.map((group) => ({
        ...group,
        roles: group.roles.map((role) => {
          const { _count, ...rest } = role;

          return {
            ...rest,
            registered: _count?.EventOnUsers ?? 0,
          };
        }),
      })),
    };
  }

  // private async saveLogosFirebase(
  //   eventId: string,
  //   logoFile: Express.Multer.File,
  //   coverFile: Express.Multer.File,
  // ): Promise<{ coverUrl: string | null; logoUrl: string | null }> {
  //   const bucket = admin.storage().bucket();
  //   let logoUrl = null;
  //   let coverUrl = null;

  //   if (logoFile) {
  //     const logoPath = `events/${eventId}/logo/logo.svg`;
  //     const bucketName = admin.storage().bucket().name;

  //     const logoBucket = bucket.file(logoPath);
  //     await logoBucket.save(logoFile.buffer, {
  //       contentType: logoFile.mimetype,
  //     });

  //     const logoPublicPath = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
  //       logoPath,
  //     )}?alt=media`;
  //     logoUrl = logoPublicPath;
  //   }
  //   if (coverFile) {
  //     const coverPath = `events/${eventId}/cover/cover.${
  //       coverFile.mimetype.split('/')[1]
  //     }`;
  //     const bucketName = admin.storage().bucket().name;
  //     const coverBucket = bucket.file(coverPath);
  //     await coverBucket.save(coverFile.buffer, {
  //       contentType: coverFile.mimetype,
  //     });

  //     const coverPublicPath = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
  //       coverPath,
  //     )}?alt=media`;
  //     coverUrl = coverPublicPath;
  //   }
  //   return { coverUrl, logoUrl };
  // }

  async create(data: EventDto) {
    try {
      data.endDate = new Date(data.endDate);
      data.startDate = new Date(data.startDate);

      // 1. Cria o evento primeiro (sem upload)
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

      // 2. Uploads fora da transaction

      const [coverResult, logoResult] = await Promise.all([
        data.coverFile
          ? uploadImageFirebase(
              data.coverFile,
              `events/${event.id}/cover/cover.${
                data.coverFile.mimetype.split('/')[1]
              }`,
            )
          : null,

        data.logoFile
          ? uploadImageFirebase(
              data.logoFile,
              `events/${event.id}/logo/logo.${
                data.logoFile.mimetype.split('/')[1]
              }`,
            )
          : null,
      ]);

      const coverUrl = coverResult?.url ?? null;
      const logoUrl = logoResult?.url ?? null;

      const jsonData: Prisma.JsonObject = {
        ...((data.data as Prisma.JsonObject) ?? {}),
        coverUrl,
        logoUrl,
      };

      // 3. Atualiza o evento com URLs
      const updatedEvent = await this.prisma.event.update({
        where: { id: event.id },
        data: {
          data: jsonData,
        },
      });

      return updatedEvent;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException();
    }
  }

  async findInsightsEvents() {
    const events = await this.prisma.event.findMany({
      select: {
        id: true,
        isActive: true,
        startDate: true,
        users: {
          select: {
            createdAt: true,
            user: {
              select: {
                worker: true,
              },
            },
          },
        },
      },
    });

    if (!events.length) {
      return {
        totalEvents: 0,
        totalEventsActive: 0,
        timeToFillHours: 0,
        timeToFillWorkerHours: 0,
        eventsInCurrentQuarter: 0,
      };
    }

    // 📊 Eventos por trimestre
    const trimestres = [0, 0, 0, 0];

    events.forEach((event) => {
      const month = new Date(event.startDate).getMonth();
      const quarter = Math.floor(month / 3);
      trimestres[quarter]++;
    });

    const totalEventos = trimestres.reduce((acc, val) => acc + val, 0);
    const eventsInCurrentQuarter = Number((totalEventos / 4).toFixed(2));

    // 📌 Totais
    const totalEvents = events.length;
    const totalEventsActive = events.filter((e) => e.isActive).length;

    // ⏱ Calcula tempo entre primeiro e último inscrito
    function getTimeToFill(users: { createdAt: Date }[]): number | null {
      if (users.length < 2) return null;

      let min = Infinity;
      let max = -Infinity;

      for (const u of users) {
        const t = new Date(u.createdAt).getTime();
        if (t < min) min = t;
        if (t > max) max = t;
      }

      return (max - min) / (1000 * 60 * 60);
    }

    let totalTimeUser = 0;
    let totalTimeWorker = 0;
    let countUser = 0;
    let countWorker = 0;

    events.forEach((event) => {
      const commonUsers = event.users.filter((u) => !u.user.worker);
      const workers = event.users.filter((u) => u.user.worker);

      const timeUser = getTimeToFill(commonUsers);
      const timeWorker = getTimeToFill(workers);

      if (timeUser !== null) {
        totalTimeUser += timeUser;
        countUser++;
      }

      if (timeWorker !== null) {
        totalTimeWorker += timeWorker;
        countWorker++;
      }
    });

    return {
      totalEvents,
      totalEventsActive,
      timeToFillHours: countUser
        ? Number((totalTimeUser / countUser).toFixed(2))
        : 0,
      timeToFillWorkerHours: countWorker
        ? Number((totalTimeWorker / countWorker).toFixed(2))
        : 0,
      eventsInCurrentQuarter,
    };
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
          endDate: true,
          isActive: true,
          data: true,
          groupRoles: {
            select: {
              capacity: true,
            },
          },
          _count: {
            select: {
              waitlist: true,
              bedrooms: true,
              Team: true,
              users: true,
            },
          },
        },
      })
      .then((events) => this.handlerReturnAllEvents(events));

    return events;
  }

  async findOne(id: string) {
    const event = await this.prisma.event
      .findUnique({
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
      })
      .then((event) => this.handlerReturnEvent(event));
    if (!event) {
      throw new NotFoundException('Event does not exist');
    }
    return event;
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

    // ================= UPLOADS (FORA DA TRANSACTION) =================

    let coverUrl = event.data?.['coverUrl'] ?? null;
    let logoUrl = event.data?.['logoUrl'] ?? null;
    let logoUrlInverted = event.data?.['logoUrlInverted'] ?? null;

    const [coverResult, logoResult] = await Promise.all([
      updateEvent.coverFile
        ? uploadImageFirebase(
            updateEvent.coverFile,
            `events/${event.id}/cover/cover.${
              updateEvent.coverFile.mimetype.split('/')[1]
            }`,
          )
        : null,

      updateEvent.logoFile
        ? uploadImageFirebase(
            updateEvent.logoFile,
            `events/${event.id}/logo/logo.${
              updateEvent.logoFile.mimetype.split('/')[1]
            }`,
          )
        : null,
    ]);

    if (coverResult) coverUrl = coverResult.url;
    if (logoResult) logoUrl = logoResult.url;

    // Logo invertida apenas se veio nova logo
    if (updateEvent.logoFile) {
      const blackBuffer = await sharp(updateEvent.logoFile.buffer)
        .negate({ alpha: false })
        .greyscale()
        .tint({ r: 0, g: 0, b: 0 })
        .png()
        .toBuffer();

      const blackFile: Express.Multer.File = {
        ...updateEvent.logoFile,
        buffer: blackBuffer,
        mimetype: 'image/png',
      };

      logoUrlInverted = (
        await uploadImageFirebase(
          blackFile,
          `events/${event.id}/logo/logoInvert.png`,
        )
      ).url;
    }
    const safeData = structuredClone(updateEvent.data ?? {}) as Record<
      string,
      any
    >;

    const jsonData: Prisma.JsonObject = {
      ...safeData,
      coverUrl,
      logoUrl,
      logoUrlInverted,
    } as Prisma.JsonObject;

    const startDate = new Date(updateEvent.startDate);
    const endDate = new Date(updateEvent.endDate);

    // ================= TRANSACTION SOMENTE PARA BANCO =================

    await this.prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id },
        data: {
          type: updateEvent.type,
          name: updateEvent.name,
          startDate,
          endDate,
          isActive: updateEvent.isActive,
          groupLink: updateEvent.groupLink,
          data: jsonData,
        },
      });

      if (!updateEvent.groupRoles?.length) return;

      const dbGroups = new Map(event.groupRoles.map((g) => [g.id, g]));

      const incomingGroups = new Map(
        updateEvent.groupRoles.filter((g) => g.id).map((g) => [g.id!, g]),
      );

      // REMOVER GRUPOS AUSENTES
      for (const group of dbGroups.values()) {
        if (!incomingGroups.has(group.id)) {
          const hasUsers = group.roles.some((r) => r._count.EventOnUsers > 0);

          if (hasUsers) {
            throw new BadRequestException(
              `Group "${group.name}" has registered users and cannot be removed`,
            );
          }

          await tx.groupRoles.delete({ where: { id: group.id } });
        }
      }

      // CRIAR / ATUALIZAR GRUPOS
      for (const group of updateEvent.groupRoles) {
        let groupId = group.id;

        if (groupId && dbGroups.has(groupId)) {
          await tx.groupRoles.update({
            where: { id: groupId },
            data: {
              name: group.name,
              capacity: group.capacity,
            },
          });
        } else {
          const created = await tx.groupRoles.create({
            data: {
              name: group.name,
              capacity: group.capacity,
              eventId: id,
            },
          });

          groupId = created.id;
        }

        const dbRoles = dbGroups.get(groupId)?.roles ?? [];

        const incomingRoles = new Map(
          group.roles.filter((r) => r.id).map((r) => [r.id!, r]),
        );

        // REMOVER ROLES AUSENTES
        for (const role of dbRoles) {
          if (!incomingRoles.has(role.id)) {
            if (role._count.EventOnUsers > 0) {
              throw new BadRequestException(
                `Role "${role.description}" already has users and cannot be removed`,
              );
            }

            await tx.rolesRegistration.delete({ where: { id: role.id } });
          }
        }

        // CRIAR / ATUALIZAR ROLES
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
      return { message: 'User removed from event successfully' };
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
      return { message: `Event ${id} deleted successfully` };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async findUsers(eventId: string) {
    return this.prisma.eventOnUsers
      .findMany({
        where: { eventId },

        include: {
          user: {
            include: {
              bedrooms: {
                where: {
                  bedrooms: {
                    eventId,
                  },
                },
                include: {
                  bedrooms: true,
                },
              },

              TeamOnUsers: {
                where: {
                  team: {
                    eventId,
                  },
                },
                include: {
                  team: true,
                },
              },
            },
          },

          rolesRegistration: {
            include: {
              role: {
                include: {
                  group: true,
                },
              },
            },
          },
        },
      })
      .then((data) => this.handleformatUsers(data));
  }

  async findUsersInWaitlist(idEvent: string) {
    return this.prisma.waitlist
      .findMany({
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
              badgeName: true,
              birthday: true,
              city: true,
              neighborhood: true,
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
      })
      .then((data) => this.handleformatUsersWaitlist(data));
  }
  async removeUserFromWaitlist(
    idUser: string,
    idEvent: string,
    roleRegistrationId: string,
  ) {
    const waitlistEntry = await this.prisma.waitlist.findFirst({
      where: { userId: idUser, eventId: idEvent, roleRegistrationId },
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
  async movedUserFromWaitlistToEvent(
    userId: string,
    eventId: string,
    roleRegistrationId: string,
  ) {
    return await this.prisma.$transaction(
      async (tx) => {
        const waitlistEntry = await tx.waitlist.findFirst({
          where: { userId, eventId, roleRegistrationId },
        });

        if (!waitlistEntry) {
          throw new NotFoundException('Waitlist entry does not exist!');
        }

        await tx.waitlist.delete({
          where: { id: waitlistEntry.id },
        });

        const registration = await this.registerUserInEvent(
          userId,
          eventId,
          [waitlistEntry.roleRegistrationId],
          { tx, movingFromWaitlist: true },
        );
        if (registration[0].type === 'WAITLIST') {
          // se ainda ficou na waitlist, deve falar o tx
          throw new BadRequestException(
            'Não há vagas disponíveis no evento para nesse grupo',
          );
        }

        return registration;
      },
      { isolationLevel: 'Serializable' },
    );
  }
}
