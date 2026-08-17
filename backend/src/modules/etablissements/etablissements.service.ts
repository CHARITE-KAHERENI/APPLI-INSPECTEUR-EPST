import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { SubscribersService } from '../subscriptions/subscribers.service';
import { CreateEtablissementDto } from './dto/create-etablissement.dto';
import { QueryEtablissementDto } from './dto/query-etablissement.dto';
import { UpdateEtablissementDto } from './dto/update-etablissement.dto';
import { EtablissementEntity } from './entities/etablissement.entity';

@Injectable()
export class EtablissementsService {
  constructor(
    @InjectRepository(EtablissementEntity)
    private readonly repository: Repository<EtablissementEntity>,
    private readonly subscribersService: SubscribersService,
  ) {}

  /**
   * Active automatiquement l'essai gratuit de 14 jours à la création du
   * compte établissement — voir PROMPT 7, point 1, et
   * `SubscribersService.createTrialForEtablissement`.
   */
  async create(dto: CreateEtablissementDto): Promise<EtablissementEntity> {
    const etablissement = await this.repository.save(
      this.repository.create(dto),
    );
    await this.subscribersService.createTrialForEtablissement(etablissement.id);
    return etablissement;
  }

  findAll(query: QueryEtablissementDto): Promise<EtablissementEntity[]> {
    return this.repository.find({
      where: {
        ...(query.search ? { nom: ILike(`%${query.search}%`) } : {}),
        ...(query.zone ? { zone: query.zone } : {}),
        ...(query.province ? { province: query.province } : {}),
      },
      order: { nom: 'ASC' },
    });
  }

  async findOne(id: string): Promise<EtablissementEntity> {
    const etablissement = await this.repository.findOne({ where: { id } });
    if (!etablissement) {
      throw new NotFoundException(`Établissement "${id}" introuvable.`);
    }
    return etablissement;
  }

  async update(
    id: string,
    dto: UpdateEtablissementDto,
  ): Promise<EtablissementEntity> {
    const etablissement = await this.findOne(id);
    Object.assign(etablissement, dto);
    return this.repository.save(etablissement);
  }

  async remove(id: string): Promise<void> {
    const etablissement = await this.findOne(id);
    await this.repository.remove(etablissement);
  }
}
