import type { FormTemplate } from '@c3-digital/shared';
import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FormSubmissionsService } from '../form-submissions/form-submissions.service';
import { FormTemplatesService } from '../form-templates/form-templates.service';
import { UserEntity } from '../users/entities/user.entity';
import { PdfSubmissionInput } from './pdf-submission-input';
import { PdfTemplateService } from './pdf-template.service';
import { PdfService } from './pdf.service';

/**
 * Génération PDF côté serveur d'un formulaire rempli (utilisée par le web
 * de consultation) — voir `mobile/lib/core/pdf/` pour l'équivalent
 * hors-ligne côté mobile. Restreint au même périmètre par rôle que
 * `GET /form-submissions/:id` (voir `FormSubmissionsService.findOneScoped`).
 */
@UseGuards(JwtAuthGuard)
@Controller('form-submissions')
export class PdfController {
  constructor(
    private readonly formSubmissionsService: FormSubmissionsService,
    private readonly formTemplatesService: FormTemplatesService,
    private readonly pdfTemplateService: PdfTemplateService,
    private readonly pdfService: PdfService,
  ) {}

  @Get(':id/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
    @Res() res: Response,
  ): Promise<void> {
    const submission = await this.formSubmissionsService.findOneScoped(
      id,
      user,
    );
    const templateEntity = await this.formTemplatesService.findById(
      submission.templateId,
    );

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
