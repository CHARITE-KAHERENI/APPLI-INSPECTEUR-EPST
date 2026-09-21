import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlanEntity } from './entities/subscription-plan.entity';

/** Lecture des 3 formules payantes (5 lignes : mensuel, annuel, pack_10/20/50) — voir `seed-subscription-plans.ts`. */
@Injectable()
export class SubscriptionPlansService {
  constructor(
    @InjectRepository(SubscriptionPlanEntity)
    private readonly repository: Repository<SubscriptionPlanEntity>,
  ) {}

  findAllActive(): Promise<SubscriptionPlanEntity[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { priceFc: 'ASC' },
    });
  }

  async findByCode(code: string): Promise<SubscriptionPlanEntity> {
    const plan = await this.repository.findOne({
      where: { code, isActive: true },
    });
    if (!plan) {
      throw new NotFoundException(`Formule "${code}" introuvable ou inactive.`);
    }
    return plan;
  }
}
