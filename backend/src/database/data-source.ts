import 'dotenv/config';
import { DataSource } from 'typeorm';
import { AiTrendAnalysisEntity } from '../modules/ai/entities/ai-trend-analysis.entity';
import { EnseignantEntity } from '../modules/enseignants/entities/enseignant.entity';
import { EtablissementEntity } from '../modules/etablissements/entities/etablissement.entity';
import { FormTemplateEntity } from '../modules/form-templates/entities/form-template.entity';
import { FormSubmissionEntity } from '../modules/form-submissions/entities/form-submission.entity';
import { InspecteurEntity } from '../modules/inspecteurs/entities/inspecteur.entity';
import { PaymentEntity } from '../modules/subscriptions/entities/payment.entity';
import { SubscriberEntity } from '../modules/subscriptions/entities/subscriber.entity';
import { SubscriptionNotificationEntity } from '../modules/subscriptions/entities/subscription-notification.entity';
import { SubscriptionPlanEntity } from '../modules/subscriptions/entities/subscription-plan.entity';
import { FormSubmissionVersionEntity } from '../modules/sync/entities/form-submission-version.entity';
import { UserEntity } from '../modules/users/entities/user.entity';

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
    EtablissementEntity,
    EnseignantEntity,
    InspecteurEntity,
    UserEntity,
    SubscriptionPlanEntity,
    SubscriberEntity,
    PaymentEntity,
    SubscriptionNotificationEntity,
    AiTrendAnalysisEntity,
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
