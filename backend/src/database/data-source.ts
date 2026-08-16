import 'dotenv/config';
import { DataSource } from 'typeorm';
import { FormTemplateEntity } from '../modules/form-templates/entities/form-template.entity';
import { FormSubmissionEntity } from '../modules/form-submissions/entities/form-submission.entity';
import { FormSubmissionVersionEntity } from '../modules/sync/entities/form-submission-version.entity';

/**
 * DataSource utilisé exclusivement par la CLI TypeORM (génération et
 * exécution des migrations : `npm run migration:run`). L'application
 * NestJS elle-même se connecte via `TypeOrmModule.forRootAsync` dans
 * `app.module.ts`.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'c3digital',
  password: process.env.DATABASE_PASSWORD ?? 'c3digital',
  database: process.env.DATABASE_NAME ?? 'c3_digital',
  entities: [
    FormTemplateEntity,
    FormSubmissionEntity,
    FormSubmissionVersionEntity,
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
