import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { CreateEnseignantDto } from './dto/create-enseignant.dto';
import { QueryEnseignantDto } from './dto/query-enseignant.dto';
import { UpdateEnseignantDto } from './dto/update-enseignant.dto';
import { EnseignantEntity } from './entities/enseignant.entity';

@Injectable()
export class EnseignantsService {
  constructor(
    @InjectRepository(EnseignantEntity)
    private readonly repository: Repository<EnseignantEntity>,
  ) {}

  create(dto: CreateEnseignantDto): Promise<EnseignantEntity> {
    return this.repository.save(this.repository.create(dto));
  }

  findAll(query: QueryEnseignantDto): Promise<EnseignantEntity[]> {
    return this.repository.find({
      where: {
        ...(query.search ? { nom: ILike(`%${query.search}%`) } : {}),
        ...(query.etablissementId ? { etablissementId: query.etablissementId } : {}),
      },
      order: { nom: 'ASC' },
    });
  }

  async findOne(id: string): Promise<EnseignantEntity> {
    const enseignant = await this.repository.findOne({ where: { id } });
    if (!enseignant) {
      throw new NotFoundException(`Enseignant "${id}" introuvable.`);
    }
    return enseignant;
  }

  async update(id: string, dto: UpdateEnseignantDto): Promise<EnseignantEntity> {
    const enseignant = await this.findOne(id);
    Object.assign(enseignant, dto);
    return this.repository.save(enseignant);
  }

  async remove(id: string): Promise<void> {
    const enseignant = await this.findOne(id);
    await this.repository.remove(enseignant);
  }
}
