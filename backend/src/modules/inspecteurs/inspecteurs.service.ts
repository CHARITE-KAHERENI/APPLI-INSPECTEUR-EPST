import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { SubscribersService } from '../subscriptions/subscribers.service';
import { CreateInspecteurDto } from './dto/create-inspecteur.dto';
import { QueryInspecteurDto } from './dto/query-inspecteur.dto';
import { UpdateInspecteurDto } from './dto/update-inspecteur.dto';
import { InspecteurEntity } from './entities/inspecteur.entity';

@Injectable()
export class InspecteursService {
  constructor(
    @InjectRepository(InspecteurEntity)
    private readonly repository: Repository<InspecteurEntity>,
    private readonly subscribersService: SubscribersService,
  ) {}

  /**
   * Active automatiquement l'essai gratuit de 14 jours à la création du
   * compte inspecteur — voir PROMPT 7, point 1, et
   * `SubscribersService.createTrialForInspecteur`.
   */
  async create(dto: CreateInspecteurDto): Promise<InspecteurEntity> {
    const inspecteur = await this.repository.save(this.repository.create(dto));
    await this.subscribersService.createTrialForInspecteur(inspecteur.id);
    return inspecteur;
  }

  findAll(query: QueryInspecteurDto): Promise<InspecteurEntity[]> {
    return this.repository.find({
      where: {
        ...(query.search ? { nom: ILike(`%${query.search}%`) } : {}),
        ...(query.zone ? { zone: query.zone } : {}),
      },
      order: { nom: 'ASC' },
    });
  }

  async findOne(id: string): Promise<InspecteurEntity> {
    const inspecteur = await this.repository.findOne({ where: { id } });
    if (!inspecteur) {
      throw new NotFoundException(`Inspecteur "${id}" introuvable.`);
    }
    return inspecteur;
  }

  async update(
    id: string,
    dto: UpdateInspecteurDto,
  ): Promise<InspecteurEntity> {
    const inspecteur = await this.findOne(id);
    Object.assign(inspecteur, dto);
    return this.repository.save(inspecteur);
  }

  async remove(id: string): Promise<void> {
    const inspecteur = await this.findOne(id);
    await this.repository.remove(inspecteur);
  }
}
