import { FormCode } from '@c3-digital/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormTemplateEntity } from './entities/form-template.entity';

@Injectable()
export class FormTemplatesService {
  constructor(
    @InjectRepository(FormTemplateEntity)
    private readonly repository: Repository<FormTemplateEntity>,
  ) {}

  findAllActive(): Promise<FormTemplateEntity[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { code: 'ASC', version: 'DESC' },
    });
  }

  async findActiveByCode(code: FormCode): Promise<FormTemplateEntity> {
    const template = await this.repository.findOne({
      where: { code, isActive: true },
      order: { version: 'DESC' },
    });
    if (!template) {
      throw new NotFoundException(
        `Aucun template actif pour le formulaire "${code}".`,
      );
    }
    return template;
  }

  /**
   * Récupère un template par son identifiant exact, y compris s'il n'est
   * plus la version active — nécessaire pour régénérer fidèlement le PDF
   * d'un formulaire rempli avec une version de template plus ancienne
   * (voir `modules/pdf`).
   */
  async findById(id: string): Promise<FormTemplateEntity> {
    const template = await this.repository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Template "${id}" introuvable.`);
    }
    return template;
  }
}
