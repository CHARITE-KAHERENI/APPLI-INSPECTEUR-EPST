import 'dotenv/config';
import type { CriterionResponse, SectionResponse } from '@c3-digital/shared';
import { computeSectionScore } from '@c3-digital/shared';
import * as bcrypt from 'bcryptjs';
import { EnseignantEntity } from '../../modules/enseignants/entities/enseignant.entity';
import { EtablissementEntity } from '../../modules/etablissements/entities/etablissement.entity';
import { FormSubmissionEntity } from '../../modules/form-submissions/entities/form-submission.entity';
import { computeOverallScore } from '../../modules/form-submissions/overall-score.util';
import { FormTemplateEntity } from '../../modules/form-templates/entities/form-template.entity';
import { InspecteurEntity } from '../../modules/inspecteurs/entities/inspecteur.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import dataSource from '../data-source';

/**
 * Jeu de données de démonstration — entièrement fictif (établissements,
 * enseignants, inspecteurs et formulaires portent tous la mention
 * "(exemple)"/"(fictif)") — pour disposer d'un compte par rôle et de
 * quelques inspections réparties sur deux zones IGE, utile pour tester
 * l'authentification et les règles d'autorisation (PROMPT 6).
 *
 * Usage : npm run seed:auth-directory (après npm run seed:form-templates)
 *
 * Mot de passe de tous les comptes créés : "password123" — uniquement
 * pour le développement local, jamais pour un déploiement réel.
 */
const DEMO_PASSWORD = 'password123';

async function seed() {
  await dataSource.initialize();

  const etablissementRepo = dataSource.getRepository(EtablissementEntity);
  const enseignantRepo = dataSource.getRepository(EnseignantEntity);
  const inspecteurRepo = dataSource.getRepository(InspecteurEntity);
  const userRepo = dataSource.getRepository(UserEntity);
  const templateRepo = dataSource.getRepository(FormTemplateEntity);
  const submissionRepo = dataSource.getRepository(FormSubmissionEntity);

  // --- Établissements (deux zones IGE distinctes, pour tester le filtre "zone") ---
  const institutDeLaPaix = await upsertEtablissement(etablissementRepo, {
    nom: 'Institut de la Paix (exemple)',
    code: 'EX-NK-001',
    province: 'Nord-Kivu',
    sousDivision: 'Goma I',
    milieu: 'Urbain',
    zone: 'Nord-Kivu 2',
  });
  const epExempleKinshasa = await upsertEtablissement(etablissementRepo, {
    nom: 'EP Exemple Kinshasa (exemple)',
    code: 'EX-KIN-001',
    province: 'Kinshasa',
    sousDivision: 'Lukunga',
    milieu: 'Urbain',
    zone: 'Kinshasa 1',
  });

  // --- Enseignants ---
  const mukendi = await upsertEnseignant(enseignantRepo, {
    nom: 'MUKENDI Jean (fictif)',
    sexe: 'M',
    matiere: 'Mathématiques',
    etablissementId: institutDeLaPaix.id,
  });
  const kabongo = await upsertEnseignant(enseignantRepo, {
    nom: 'KABONGO Alice (fictive)',
    sexe: 'F',
    matiere: 'Français',
    etablissementId: epExempleKinshasa.id,
  });

  // --- Inspecteurs ---
  const tshisekedi = await upsertInspecteur(inspecteurRepo, {
    nom: 'TSHISEKEDI Paul (fictif)',
    sexe: 'M',
    posteAttache: 'Inspection Provinciale du Nord-Kivu',
    zone: 'Nord-Kivu 2',
  });
  const ilunga = await upsertInspecteur(inspecteurRepo, {
    nom: 'ILUNGA Sarah (fictive)',
    sexe: 'F',
    posteAttache: 'Inspection Urbaine de Kinshasa',
    zone: 'Kinshasa 1',
  });

  // --- Comptes utilisateurs (un par rôle) ---
  const users: Array<
    Partial<UserEntity> & { email: string; fullName: string }
  > = [
    {
      email: 'super.admin@exemple.cd',
      fullName: 'Super Administrateur (exemple)',
      role: 'super_admin',
    },
    {
      email: 'ige.nordkivu2@exemple.cd',
      fullName: 'IGE Nord-Kivu 2 (exemple)',
      role: 'ige_admin',
      zone: 'Nord-Kivu 2',
    },
    {
      email: 'chef.institutdelapaix@exemple.cd',
      fullName: 'KABEYA Marie (fictive)',
      role: 'chef_etablissement',
      etablissementId: institutDeLaPaix.id,
    },
    {
      email: 'inspecteur.tshisekedi@exemple.cd',
      fullName: 'TSHISEKEDI Paul (fictif)',
      role: 'inspecteur',
      inspecteurId: tshisekedi.id,
    },
    {
      email: 'enseignant.mukendi@exemple.cd',
      fullName: 'MUKENDI Jean (fictif)',
      role: 'enseignant',
      enseignantId: mukendi.id,
    },
  ];

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const data of users) {
    await upsertUser(userRepo, { ...data, passwordHash });
  }

  // --- Inspections de démonstration ---
  const c3Template = await templateRepo.findOne({
    where: { code: 'C3', isActive: true },
  });
  if (c3Template) {
    await upsertDemoSubmission(submissionRepo, c3Template, {
      reportNumber: 'RP-DEMO-NK2-001',
      schoolYear: '2025-2026',
      etablissement: institutDeLaPaix,
      enseignant: mukendi,
      inspecteur: tshisekedi,
    });
    await upsertDemoSubmission(submissionRepo, c3Template, {
      reportNumber: 'RP-DEMO-KIN1-001',
      schoolYear: '2025-2026',
      etablissement: epExempleKinshasa,
      enseignant: kabongo,
      inspecteur: ilunga,
    });
  } else {
    console.warn(
      '⚠ Aucun template C3 actif trouvé — avez-vous lancé "npm run seed:form-templates" avant ce script ? Inspections de démonstration ignorées.',
    );
  }

  await dataSource.destroy();

  console.log(
    '\nComptes de démonstration (mot de passe : "%s") :',
    DEMO_PASSWORD,
  );
  for (const user of users) {
    console.log(`  - ${user.email}  (${user.role})`);
  }
}

async function upsertEtablissement(
  repo: ReturnType<typeof dataSource.getRepository<EtablissementEntity>>,
  data: Partial<EtablissementEntity> & { nom: string },
): Promise<EtablissementEntity> {
  const existing = await repo.findOne({ where: { nom: data.nom } });
  const entity = existing ?? repo.create();
  Object.assign(entity, data);
  const saved = await repo.save(entity);
  console.log(
    `✓ Établissement "${saved.nom}" (${existing ? 'mis à jour' : 'créé'})`,
  );
  return saved;
}

async function upsertEnseignant(
  repo: ReturnType<typeof dataSource.getRepository<EnseignantEntity>>,
  data: Partial<EnseignantEntity> & { nom: string },
): Promise<EnseignantEntity> {
  const existing = await repo.findOne({ where: { nom: data.nom } });
  const entity = existing ?? repo.create();
  Object.assign(entity, data);
  const saved = await repo.save(entity);
  console.log(
    `✓ Enseignant "${saved.nom}" (${existing ? 'mis à jour' : 'créé'})`,
  );
  return saved;
}

async function upsertInspecteur(
  repo: ReturnType<typeof dataSource.getRepository<InspecteurEntity>>,
  data: Partial<InspecteurEntity> & { nom: string },
): Promise<InspecteurEntity> {
  const existing = await repo.findOne({ where: { nom: data.nom } });
  const entity = existing ?? repo.create();
  Object.assign(entity, data);
  const saved = await repo.save(entity);
  console.log(
    `✓ Inspecteur "${saved.nom}" (${existing ? 'mis à jour' : 'créé'})`,
  );
  return saved;
}

async function upsertUser(
  repo: ReturnType<typeof dataSource.getRepository<UserEntity>>,
  data: Partial<UserEntity> & { email: string },
): Promise<UserEntity> {
  const existing = await repo.findOne({ where: { email: data.email } });
  const entity = existing ?? repo.create();
  Object.assign(entity, data);
  const saved = await repo.save(entity);
  console.log(
    `✓ Utilisateur "${saved.email}" (${existing ? 'mis à jour' : 'créé'})`,
  );
  return saved;
}

/** Notes 0-4 fictives, réparties pour obtenir un score correct mais pas parfait. */
function fictionalScores(count: number): number[] {
  return Array.from({ length: count }, (_, i) => [4, 3, 4, 3][i % 4]);
}

async function upsertDemoSubmission(
  repo: ReturnType<typeof dataSource.getRepository<FormSubmissionEntity>>,
  template: FormTemplateEntity,
  data: {
    reportNumber: string;
    schoolYear: string;
    etablissement: EtablissementEntity;
    enseignant: EnseignantEntity;
    inspecteur: InspecteurEntity;
  },
): Promise<FormSubmissionEntity> {
  const sections: SectionResponse[] = template.definition.sections.map(
    (section) => {
      const scores = fictionalScores(section.criteria.length);
      const responses: CriterionResponse[] = section.criteria.map(
        (criterion, index) => ({
          criterionId: criterion.id,
          score: scores[index] as CriterionResponse['score'],
        }),
      );
      const result = computeSectionScore(
        section,
        responses,
        template.definition.conversionTable,
      );
      return {
        sectionId: section.id,
        criteria: responses,
        totalScore: result.totalScore,
        maxScore: result.maxScore,
        percentage: result.percentage,
        mention: result.mention,
      };
    },
  );

  const overall = computeOverallScore(template.definition, sections);

  const existing = await repo.findOne({
    where: { reportNumber: data.reportNumber },
  });
  const entity = existing ?? repo.create();
  entity.templateId = template.id;
  entity.formCode = template.code;
  entity.reportNumber = data.reportNumber;
  entity.schoolYear = data.schoolYear;
  entity.header = {
    inspecteur: data.inspecteur.nom,
    etablissement: data.etablissement.nom,
    enseignant: data.enseignant.nom,
    annee_scolaire: data.schoolYear,
    numero_rapport: data.reportNumber,
  };
  entity.sections = sections;
  entity.signatures = [];
  entity.status = 'soumis';
  entity.submittedAt = existing?.submittedAt ?? new Date();
  entity.etablissementId = data.etablissement.id;
  entity.enseignantId = data.enseignant.id;
  entity.inspecteurId = data.inspecteur.id;
  entity.overallPercentage =
    overall.percentage !== null ? overall.percentage.toFixed(2) : null;
  entity.overallMention = overall.mention;

  const saved = await repo.save(entity);
  console.log(
    `✓ Inspection "${saved.reportNumber}" (${existing ? 'mise à jour' : 'créée'}) — ${saved.overallMention} (${saved.overallPercentage}%)`,
  );
  return saved;
}

seed().catch((error) => {
  console.error('Échec du seed auth/annuaire :', error);
  process.exit(1);
});
