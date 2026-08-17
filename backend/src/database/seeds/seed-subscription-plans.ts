import 'dotenv/config';
import { SubscriptionPlanEntity } from '../../modules/subscriptions/entities/subscription-plan.entity';
import dataSource from '../data-source';

/**
 * Les 3 formules payantes du PROMPT 7 — mensuel/annuel (renouvellement
 * automatique) et pack à l'usage (3 tailles : 10/20/50, valables 6 mois),
 * communes aux comptes `etablissement` et `inspecteur` (voir
 * `Subscriber.accountType`).
 *
 * Usage : npm run seed:subscription-plans
 */
const PLANS: Array<Partial<SubscriptionPlanEntity> & { code: string }> = [
  {
    code: 'mensuel',
    label: 'Mensuel',
    kind: 'abonnement',
    priceFc: '15000.00',
    billingPeriod: 'mensuel',
    packInspections: null,
    packValidityDays: null,
    autoRenewDefault: true,
    isActive: true,
  },
  {
    code: 'annuel',
    label: 'Annuel',
    kind: 'abonnement',
    // 126 000 FC/an ≈ -30% vs 15 000 FC × 12 mois (180 000 FC).
    priceFc: '126000.00',
    billingPeriod: 'annuel',
    packInspections: null,
    packValidityDays: null,
    autoRenewDefault: true,
    isActive: true,
  },
  {
    code: 'pack_10',
    label: 'Pack 10 inspections',
    kind: 'pack',
    priceFc: '20000.00',
    billingPeriod: null,
    packInspections: 10,
    packValidityDays: 180,
    autoRenewDefault: false,
    isActive: true,
  },
  {
    code: 'pack_20',
    label: 'Pack 20 inspections',
    kind: 'pack',
    priceFc: '40000.00',
    billingPeriod: null,
    packInspections: 20,
    packValidityDays: 180,
    autoRenewDefault: false,
    isActive: true,
  },
  {
    code: 'pack_50',
    label: 'Pack 50 inspections',
    kind: 'pack',
    priceFc: '100000.00',
    billingPeriod: null,
    packInspections: 50,
    packValidityDays: 180,
    autoRenewDefault: false,
    isActive: true,
  },
];

async function seed() {
  await dataSource.initialize();
  const repo = dataSource.getRepository(SubscriptionPlanEntity);

  for (const data of PLANS) {
    const existing = await repo.findOne({ where: { code: data.code } });
    const entity = existing ?? repo.create();
    Object.assign(entity, data);
    const saved = await repo.save(entity);
    console.log(
      `✓ Formule "${saved.code}" (${existing ? 'mise à jour' : 'créée'}) — ${saved.priceFc} FC`,
    );
  }

  await dataSource.destroy();
}

seed().catch((error) => {
  console.error('Échec du seed des formules d’abonnement :', error);
  process.exit(1);
});
