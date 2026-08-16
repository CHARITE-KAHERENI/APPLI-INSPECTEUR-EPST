import type { FormTemplate } from '@c3-digital/shared';
import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { FormSubmissionsService } from '../form-submissions/form-submissions.service';
import { FormTemplatesService } from '../form-templates/form-templates.service';
import { PdfSubmissionInput } from './pdf-submission-input';
import { PdfTemplateService } from './pdf-template.service';
import { PdfService } from './pdf.service';

/**
 * Génération PDF côté serveur d'un formulaire rempli (utilisée par le
 * futur web de consultation, et par tout appelant de l'API) — voir
 * `mobile/lib/core/pdf/` pour l'équivalent hors-ligne côté mobile.
 */
@Controller('form-submissions')
export class PdfController {
  constructor(
    private readonly formSubmissionsService: FormSubmissionsService,
    private readonly formTemplatesService: FormTemplatesService,
    private readonly pdfTemplateService: PdfTemplateService,
    private readonly pdfService: PdfService,
  ) {}

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const submission = await this.formSubmissionsService.findOne(id);
    const templateEntity = await this.formTemplatesService.findById(submission.templateId);

    const template: FormTemplate = {
      id: templateEntity.id,
      code: templateEntity.code,
      name: templateEntity.name,
      version: templateEntity.version,
      description: templateEntity.description ?? undefined,
      isActive: templateEntity.isActive,
      ...templateEntity.definition,
    };

    const submissionInput: PdfSubmissionInput = {
      formCode: submission.formCode,
      reportNumber: submission.reportNumber,
      schoolYear: submission.schoolYear,
      header: submission.header,
      sections: submission.sections,
      signatures: submission.signatures,
      status: submission.status,
      generatedAt: new Date().toISOString(),
    };

    const html = this.pdfTemplateService.render(template, submissionInput);
    const pdfBuffer = await this.pdfService.generatePdf(html);

    const rawFilename = `${template.code}-${submission.reportNumber || submission.id}.pdf`;
    const filename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', String(pdfBuffer.length));
    res.send(pdfBuffer);
  }
}
