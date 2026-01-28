import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { requestContext } from 'src/context/request.context';
import { randomUUID } from 'crypto';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();

    this.$use(async (params, next) => {
      if (params.model === 'Log') return next(params);

      const actionsToLog = [
        'create',
        'update',
        'delete',
        'createMany',
        'updateMany',
        'deleteMany',
        'upsert',
      ];

      if (!actionsToLog.includes(params.action)) {
        return next(params);
      }

      const model = params.model;
      const delegate = (this as any)[
        model.charAt(0).toLowerCase() + model.slice(1)
      ];
      const userId = requestContext.getStore()?.userId ?? null;

      let before: any = null;
      let after: any = null;
      let entityId: string | null = null;

      // ==========================
      // 1. CAPTURA BEFORE
      // ==========================
      if (['update', 'delete'].includes(params.action)) {
        before = await delegate.findUnique({
          where: params.args.where,
        });
      }

      if (['updateMany', 'deleteMany'].includes(params.action)) {
        before = await delegate.findMany({
          where: params.args.where,
        });
      }

      // ==========================
      // 2. CREATE MANY → injeta IDs
      // ==========================
      let createdIds: string[] = [];

      if (params.action === 'createMany' && Array.isArray(params.args.data)) {
        params.args.data = params.args.data.map((item) => {
          const id = item.id ?? randomUUID();
          createdIds.push(id);
          return { ...item, id };
        });
      }

      // ==========================
      // 3. EXECUTA A OPERAÇÃO
      // ==========================
      let result;
      try {
        result = await next(params);
      } catch (err) {
        this.logger.error(`Erro em ${model}.${params.action}: ${err.message}`);
        throw err;
      }

      // ==========================
      // 4. CAPTURA AFTER
      // ==========================
      if (params.action === 'create') {
        after = result;
        entityId = result?.id ?? null;
      }

      if (params.action === 'update') {
        after = await delegate.findUnique({
          where: params.args.where,
        });
        entityId = after?.id ?? null;
      }

      if (params.action === 'delete') {
        after = null;
        entityId = before?.id ?? null;
      }

      if (params.action === 'createMany') {
        after = await delegate.findMany({
          where: { id: { in: createdIds } },
        });
        entityId = createdIds[0] ?? null;
      }

      if (params.action === 'updateMany') {
        const ids = before?.map((r) => r.id) ?? [];
        after = await delegate.findMany({
          where: { id: { in: ids } },
        });
        entityId = ids[0] ?? null;
      }

      if (params.action === 'deleteMany') {
        after = null;
        entityId = before?.[0]?.id ?? null;
      }

      if (params.action === 'upsert') {
        after = result;
        entityId = result?.id ?? null;
      }

      // ==========================
      // 5. SALVA LOG
      // ==========================
      await this.log.create({
        data: {
          model,
          action: params.action,
          entityId,
          before: before ?? undefined,
          after: after ?? undefined,
          userId,
        },
      });

      this.logger.log(
        `[LOG] ${model}.${params.action} user=${
          userId ?? 'anon'
        } entity=${entityId}`,
      );

      return result;
    });
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}
