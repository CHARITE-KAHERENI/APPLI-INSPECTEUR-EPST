import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration, { AppConfig } from './config/configuration';
import { AiModule } from './modules/ai/ai.module';
import { AiTrendAnalysisEntity } from './modules/ai/entities/ai-trend-analysis.entity';
import { AuthModule } from './modules/auth/auth.module';
import { EnseignantEntity } from './modules/enseignants/entities/enseignant.entity';
import { EnseignantsModule } from './modules/enseignants/enseignants.module';
import { EtablissementEntity } from './modules/etablissements/entities/etablissement.entity';
import { EtablissementsModule } from './modules/etablissements/etablissements.module';
import { FormSubmissionEntity } from './modules/form-submissions/entities/form-submission.entity';
import { FormSubmissionsModule } from './modules/form-submissions/form-submissions.module';
import { FormTemplateEntity } from './modules/form-templates/entities/form-template.entity';
import { FormTemplatesModule } from './modules/form-templates/form-templates.module';
import { InspecteurEntity } from './modules/inspecteurs/entities/inspecteur.entity';
import { InspecteursModule } from './modules/inspecteurs/inspecteurs.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { PaymentEntity } from './modules/subscriptions/entities/payment.entity';
import { SubscriberEntity } from './modules/subscriptions/entities/subscriber.entity';
import { SubscriptionNotificationEntity } from './modules/subscriptions/entities/subscription-notification.entity';
import { SubscriptionPlanEntity } from './modules/subscriptions/entities/subscription-plan.entity';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { FormSubmissionVersionEntity } from './modules/sync/entities/form-submission-version.entity';
import { SyncModule } from './modules/sync/sync.module';
import { UserEntity } from './modules/users/entities/user.entity';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const db = configService.get('database', { infer: true });
        return {
          type: 'postgres' as const,
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.name,
          ssl: db.ssl,
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
          synchronize: db.synchronize,
        };
      },
    }),
    FormTemplatesModule,
    FormSubmissionsModule,
    SyncModule,
    PdfModule,
    UsersModule,
    AuthModule,
    EtablissementsModule,
    EnseignantsModule,
    InspecteursModule,
    SubscriptionsModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
