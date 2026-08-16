import type { FormCode } from '@c3-digital/shared';
import { Controller, Get, Param } from '@nestjs/common';
import { FormTemplatesService } from './form-templates.service';

@Controller('form-templates')
export class FormTemplatesController {
  constructor(private readonly formTemplatesService: FormTemplatesService) {}

  /** Liste les templates actifs (les 5 formulaires IGE une fois configurés). */
  @Get()
  findAll() {
    return this.formTemplatesService.findAllActive();
  }

  /** Récupère le template actif le plus récent pour un code donné (ex: C3, C3M). */
  @Get(':code')
  findByCode(@Param('code') code: FormCode) {
    return this.formTemplatesService.findActiveByCode(code);
  }
}
