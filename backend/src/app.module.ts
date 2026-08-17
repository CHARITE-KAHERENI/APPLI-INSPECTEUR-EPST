import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration, { AppConfig } from './config/configuration';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
