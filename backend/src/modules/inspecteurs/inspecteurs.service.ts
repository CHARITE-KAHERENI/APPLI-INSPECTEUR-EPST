import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { CreateInspecteurDto } from './dto/create-inspecteur.dto';
import { QueryInspecteurDto } from './dto/query-inspecteur.dto';
import { UpdateInspecteurDto } from './dto/update-inspecteur.dto';
import { InspecteurEntity } from './entities/inspecteur.entity';

@Injectable()
export class InspecteursService {
  constructor(
    @InjectRepository(InspecteurEntity)
    private readonly repository: Repository<InspecteurEntity>,
  ) {}

  create(dto: CreateInspecteurDto): Promise<InspecteurEntity> {
    return this.repository.save(this.repository.create(dto));
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

  async update(id: string, dto: UpdateInspecteurDto): Promise<InspecteurEntity> {
    const inspecteur = await this.findOne(id);
    Object.assign(inspecteur, dto);
    return this.repository.save(inspecteur);
  }

  async remove(id: string): Promise<void> {
    const inspecteur = await this.findOne(id);
    await this.repository.remove(inspecteur);
  }
}
