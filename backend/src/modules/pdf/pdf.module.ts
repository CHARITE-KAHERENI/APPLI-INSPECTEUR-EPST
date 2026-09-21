import { Module } from '@nestjs/common';
import { FormSubmissionsModule } from '../form-submissions/form-submissions.module';
import { FormTemplatesModule } from '../form-templates/form-templates.module';
import { PdfController } from './pdf.controller';
import { PdfTemplateService } from './pdf-template.service';
import { PdfService } from './pdf.service';

@Module({
  imports: [FormSubmissionsModule, FormTemplatesModule],
  controllers: [PdfController],
  providers: [PdfTemplateService, PdfService],
  exports: [PdfTemplateService, PdfService],
})
export class PdfModule {}
