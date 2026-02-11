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

      const createdWheres: any[] = [];

      // ==========================
      // 1. BEFORE
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
      // 2. CREATE MANY → tratar id simples ou composto
      // ==========================
      if (params.action === 'createMany' && Array.isArray(params.args.data)) {
        params.args.data = params.args.data.map((item: any) => {
          // Se tiver id simples
          if ('id' in item) {
            const id = item.id ?? randomUUID();
            createdWheres.push({ id });
            return { ...item, id };
          }

          // Caso NÃO tenha id (chave composta)
          // Usa todos os campos enviados como identificador
          createdWheres.push({ ...item });

          return item;
        });
      }

      // ==========================
      // 3. EXECUTA
      // ==========================
      let result;
      try {
        result = await next(params);
      } catch (err: any) {
        this.logger.error(`Erro em ${model}.${params.action}: ${err.message}`);
        throw err;
      }

      // ==========================
      // 4. AFTER
      // ==========================

      if (params.action === 'create') {
        after = result;
        entityId = result?.id ?? JSON.stringify(params.args.data);
      }

      if (params.action === 'update') {
        after = await delegate.findUnique({
          where: params.args.where,
        });
        entityId = after?.id ?? JSON.stringify(params.args.where);
      }

      if (params.action === 'delete') {
        after = null;
        entityId = before?.id ?? JSON.stringify(params.args.where);
      }

      if (params.action === 'createMany') {
        if (createdWheres.length > 0) {
          after = await delegate.findMany({
            where: {
              OR: createdWheres,
            },
          });
        }

        entityId = after?.[0]?.id ?? JSON.stringify(createdWheres[0] ?? null);
      }

      if (params.action === 'updateMany') {
        const ids = before?.map((r: any) => r.id).filter(Boolean) ?? [];

        if (ids.length > 0) {
          after = await delegate.findMany({
            where: { id: { in: ids } },
          });
        }

        entityId = ids[0] ?? JSON.stringify(params.args.where);
      }

      if (params.action === 'deleteMany') {
        after = null;
        entityId = before?.[0]?.id ?? JSON.stringify(params.args.where);
      }

      if (params.action === 'upsert') {
        after = result;
        entityId = result?.id ?? JSON.stringify(params.args.where);
      }

      // ==========================
      // 5. LOG
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
