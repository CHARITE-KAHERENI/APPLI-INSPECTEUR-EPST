import { FormSubmissionStatus } from '@c3-digital/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFormSubmissionDto } from './dto/create-form-submission.dto';
import { FormSubmissionEntity } from './entities/form-submission.entity';

@Injectable()
export class FormSubmissionsService {
  constructor(
    @InjectRepository(FormSubmissionEntity)
    private readonly repository: Repository<FormSubmissionEntity>,
  ) {}

  create(dto: CreateFormSubmissionDto): Promise<FormSubmissionEntity> {
    const submission = this.repository.create({
      ...dto,
      sections: dto.sections ?? [],
      signatures: dto.signatures ?? [],
      status: 'brouillon',
    });
    return this.repository.save(submission);
  }

  findAll(): Promise<FormSubmissionEntity[]> {
    return this.repository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<FormSubmissionEntity> {
    const submission = await this.repository.findOne({ where: { id } });
    if (!submission) {
      throw new NotFoundException(`Formulaire "${id}" introuvable.`);
    }
    return submission;
  }

  /**
   * Fait avancer le cycle de vie du formulaire : brouillon -> soumis ->
   * synchronise. Horodate automatiquement `submittedAt` / `syncedAt`.
   */
  async updateStatus(
    id: string,
    status: FormSubmissionStatus,
  ): Promise<FormSubmissionEntity> {
    const submission = await this.findOne(id);
    submission.status = status;
    if (status === 'soumis' && !submission.submittedAt) {
      submission.submittedAt = new Date();
    }
    if (status === 'synchronise' && !submission.syncedAt) {
      submission.syncedAt = new Date();
    }
    return this.repository.save(submission);
  }
}
