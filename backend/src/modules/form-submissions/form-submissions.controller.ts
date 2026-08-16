import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateFormSubmissionDto } from './dto/create-form-submission.dto';
import { UpdateFormSubmissionStatusDto } from './dto/update-form-submission-status.dto';
import { FormSubmissionsService } from './form-submissions.service';

@Controller('form-submissions')
export class FormSubmissionsController {
  constructor(
    private readonly formSubmissionsService: FormSubmissionsService,
  ) {}

  /** Crée un formulaire en statut "brouillon" (saisie initiale, potentiellement hors-ligne). */
  @Post()
  create(@Body() dto: CreateFormSubmissionDto) {
    return this.formSubmissionsService.create(dto);
  }

  @Get()
  findAll() {
    return this.formSubmissionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.formSubmissionsService.findOne(id);
  }

  /** Fait transitionner le statut : brouillon -> soumis -> synchronise. */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFormSubmissionStatusDto,
  ) {
    return this.formSubmissionsService.updateStatus(id, dto.status);
  }
}
