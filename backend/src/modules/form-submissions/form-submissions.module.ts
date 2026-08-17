import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { FormTemplateEntity } from '../form-templates/entities/form-template.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { FormSubmissionEntity } from './entities/form-submission.entity';
import { FormSubmissionsController } from './form-submissions.controller';
import { FormSubmissionsService } from './form-submissions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FormSubmissionEntity, FormTemplateEntity]),
    AuthModule,
    SubscriptionsModule,
  ],
  controllers: [FormSubmissionsController],
  providers: [FormSubmissionsService],
  exports: [FormSubmissionsService],
})
export class FormSubmissionsModule {}
