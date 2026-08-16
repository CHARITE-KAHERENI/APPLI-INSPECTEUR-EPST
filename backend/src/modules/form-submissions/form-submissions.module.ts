import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormTemplateEntity } from '../form-templates/entities/form-template.entity';
import { FormSubmissionEntity } from './entities/form-submission.entity';
import { FormSubmissionsController } from './form-submissions.controller';
import { FormSubmissionsService } from './form-submissions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FormSubmissionEntity, FormTemplateEntity]),
  ],
  controllers: [FormSubmissionsController],
  providers: [FormSubmissionsService],
  exports: [FormSubmissionsService],
})
export class FormSubmissionsModule {}
