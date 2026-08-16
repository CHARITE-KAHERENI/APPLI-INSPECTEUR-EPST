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
}
