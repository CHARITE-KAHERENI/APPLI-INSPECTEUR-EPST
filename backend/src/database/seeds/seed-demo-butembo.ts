import 'dotenv/config';
import type {
  CriterionResponse,
  FormCode,
  FormHeaderValues,
  SectionResponse,
} from '@c3-digital/shared';
import { computeSectionScore } from '@c3-digital/shared';
import * as bcrypt from 'bcryptjs';
import { EnseignantEntity } from '../../modules/enseignants/entities/enseignant.entity';
import { EtablissementEntity } from '../../modules/etablissements/entities/etablissement.entity';
import { FormSubmissionEntity } from '../../modules/form-submissions/entities/form-submission.entity';
import { computeOverallScore } from '../../modules/form-submissions/overall-score.util';
import { FormTemplateEntity } from '../../modules/form-templates/entities/form-template.entity';
import { InspecteurEntity } from '../../modules/inspecteurs/entities/inspecteur.entity';
import { SubscriberEntity } from '../../modules/subscriptions/entities/subscriber.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import dataSource from '../data-source';

/**
 * Jeu de données de démonstration pour le **déploiement pilote de
 * Butembo** (Nord-Kivu 2) — PROMPT 9, point 3. Entièrement fictif (tous
 * les noms portent la mention "(pilote)") : 4 établissements, 2
 * inspecteurs, quelques enseignants, et un exemple de formulaire rempli
 * pour chacun des 5 types officiels (C2, C3, C3B, C3M, C3_DAS), afin de
 * présenter l'application aux utilisateurs pilotes avant la mise en
 * production réelle. Complète (ne remplace pas) `seed-auth-and-directory.ts`.
 *
 * Prérequis, dans l'ordre :
 *   npm run seed:form-templates
 *   npm run seed:auth-directory
 *   npm run seed:subscription-plans
 *   npm run seed:demo-butembo   <- ce script
 *
 * Mot de passe des comptes créés : "password123" (comme les autres
 * seeds) — uniquement pour la démonstration, jamais en production.
 */
const DEMO_PASSWORD = 'password123';
const ZONE = 'Nord-Kivu 2';

async function seed() {
  await dataSource.initialize();

  const etablissementRepo = dataSource.getRepository(EtablissementEntity);
  const enseignantRepo = dataSource.getRepository(EnseignantEntity);
  const inspecteurRepo = dataSource.getRepository(InspecteurEntity);
  const userRepo = dataSource.getRepository(UserEntity);
  const templateRepo = dataSource.getRepository(FormTemplateEntity);
  const submissionRepo = dataSource.getRepository(FormSubmissionEntity);
  const subscriberRepo = dataSource.getRepository(SubscriberEntity);

  // --- Établissements (Butembo, zone IGE "Nord-Kivu 2") ---
  const epButemboCentre = await upsertEtablissement(etablissementRepo, {
    nom: 'EP Butembo Centre (pilote)',
    code: 'PIL-BUT-001',
    province: 'Nord-Kivu',
    sousDivision: 'Butembo',
    milieu: 'Urbain',
    zone: ZONE,
  });
  const institutVijana = await upsertEtablissement(etablissementRepo, {
    nom: 'Institut Vijana wa Butembo (pilote)',
    code: 'PIL-BUT-002',
    province: 'Nord-Kivu',
    sousDivision: 'Butembo',
    milieu: 'Urbain',
    zone: ZONE,
  });
  const complexeLaColombe = await upsertEtablissement(etablissementRepo, {
    nom: 'Complexe Scolaire La Colombe - Butembo (pilote)',
    code: 'PIL-BUT-003',
    province: 'Nord-Kivu',
    sousDivision: 'Butembo',
    milieu: 'Urbain',
    zone: ZONE,
  });
  const epKitatumba = await upsertEtablissement(etablissementRepo, {
    nom: 'EP Kitatumba (pilote)',
    code: 'PIL-BUT-004',
    province: 'Nord-Kivu',
    sousDivision: 'Butembo',
    milieu: 'Rural',
    zone: ZONE,
  });

  // --- Inspecteurs (Inspection Urbaine de Butembo) ---
  const kambale = await upsertInspecteur(inspecteurRepo, {
    nom: 'KAMBALE Emmanuel (pilote)',
    sexe: 'M',
    posteAttache: 'Inspection Urbaine de Butembo',
    zone: ZONE,
  });
  const masika = await upsertInspecteur(inspecteurRepo, {
    nom: 'MASIKA Furaha (pilote)',
    sexe: 'F',
    posteAttache: 'Inspection Urbaine de Butembo',
    zone: ZONE,
  });

  // --- Enseignants (un par établissement, hors EP Butembo Centre — voir
  // le formulaire C2, qui inspecte la direction et non un enseignant) ---
  const mumbereGrace = await upsertEnseignant(enseignantRepo, {
    nom: 'MUMBERE Grace (pilote)',
    sexe: 'F',
    matiere: 'Français',
    etablissementId: institutVijana.id,
  });
  const palukuDivine = await upsertEnseignant(enseignantRepo, {
    nom: 'PALUKU Divine (pilote)',
    sexe: 'M',
    matiere: 'Sciences naturelles',
    etablissementId: complexeLaColombe.id,
  });
  const kyakimwaEsperance = await upsertEnseignant(enseignantRepo, {
    nom: 'KYAKIMWA Espérance (pilote)',
    sexe: 'F',
    matiere: 'Mathématiques',
    etablissementId: epKitatumba.id,
  });
  const kambaleChristian = await upsertEnseignant(enseignantRepo, {
    nom: 'KAMBALE Christian (pilote)',
    sexe: 'M',
    matiere: 'Education civique et morale',
    etablissementId: epButemboCentre.id,
  });

  // --- Comptes de connexion pilote (chef d'établissement + inspecteurs).
  // Le compte IGE de la zone "Nord-Kivu 2" existe déjà (voir
  // seed-auth-and-directory.ts, ige.nordkivu2@exemple.cd) : il voit ces
  // établissements sans compte supplémentaire. ---
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users: Array<
    Partial<UserEntity> & { email: string; fullName: string }
  > = [
    {
      email: 'chef.epbutembocentre@pilote.cd',
      fullName: 'KAMBALE Christian (pilote)',
      role: 'chef_etablissement',
      etablissementId: epButemboCentre.id,
    },
    {
      email: 'inspecteur.kambale@pilote.cd',
      fullName: 'KAMBALE Emmanuel (pilote)',
      role: 'inspecteur',
      inspecteurId: kambale.id,
    },
    {
      email: 'inspecteur.masika@pilote.cd',
      fullName: 'MASIKA Furaha (pilote)',
      role: 'inspecteur',
      inspecteurId: masika.id,
    },
  ];
  for (const data of users) {
    await upsertUser(userRepo, { ...data, passwordHash });
  }

  // --- Essai gratuit de 14 jours pour chaque établissement/inspecteur
  // pilote — comme pour un vrai compte créé via l'API (voir
  // `EtablissementsService.create`/`InspecteursService.create`), mais
  // attribué directement ici puisque ce script écrit en base sans passer
  // par ces services (mêmes raisons que seed-subscriptions-demo.ts). ---
  const trialEndsAt = inDays(14);
  for (const etablissement of [
    epButemboCentre,
    institutVijana,
    complexeLaColombe,
    epKitatumba,
  ]) {
    await upsertTrialSubscriber(subscriberRepo, {
      accountType: 'etablissement',
      etablissementId: etablissement.id,
      trialEndsAt,
    });
  }
  for (const inspecteur of [kambale, masika]) {
    await upsertTrialSubscriber(subscriberRepo, {
      accountType: 'inspecteur',
      inspecteurId: inspecteur.id,
      trialEndsAt,
    });
  }

  // --- Un exemple de formulaire rempli pour chacun des 5 types officiels ---
  const schoolYear = '2025-2026';

  await seedSubmissionIfTemplateFound(templateRepo, submissionRepo, 'C2', {
    reportNumber: 'RP-PILOTE-BUT-C2-001',
    schoolYear,
    etablissement: epButemboCentre,
    inspecteur: kambale,
    header: {
      inspecteur: kambale.nom,
      sexe_inspecteur: kambale.sexe ?? '',
      poste_attache: kambale.posteAttache ?? '',
      etablissement: epButemboCentre.nom,
      chef_etablissement: kambaleChristian.nom,
      annee_scolaire: schoolYear,
      numero_rapport: 'RP-PILOTE-BUT-C2-001',
    },
  });

  await seedSubmissionIfTemplateFound(templateRepo, submissionRepo, 'C3', {
    reportNumber: 'RP-PILOTE-BUT-C3-001',
    schoolYear,
    etablissement: institutVijana,
    enseignant: mumbereGrace,
    inspecteur: masika,
    header: {
      inspecteur: masika.nom,
      sexe_inspecteur: masika.sexe ?? '',
      poste_attache: masika.posteAttache ?? '',
      etablissement: institutVijana.nom,
      enseignant: mumbereGrace.nom,
      annee_scolaire: schoolYear,
      numero_rapport: 'RP-PILOTE-BUT-C3-001',
    },
  });

  await seedSubmissionIfTemplateFound(templateRepo, submissionRepo, 'C3B', {
    reportNumber: 'RP-PILOTE-BUT-C3B-001',
    schoolYear,
    etablissement: complexeLaColombe,
    enseignant: palukuDivine,
    inspecteur: kambale,
    header: {
      inspecteur: kambale.nom,
      sexe_inspecteur: kambale.sexe ?? '',
      poste_attache: kambale.posteAttache ?? '',
      etablissement: complexeLaColombe.nom,
      enseignant: palukuDivine.nom,
      annee_scolaire: schoolYear,
      numero_rapport: 'RP-PILOTE-BUT-C3B-001',
    },
  });

  await seedSubmissionIfTemplateFound(templateRepo, submissionRepo, 'C3M', {
    reportNumber: 'RP-PILOTE-BUT-C3M-001',
    schoolYear,
    etablissement: epKitatumba,
    enseignant: kyakimwaEsperance,
    inspecteur: masika,
    header: {
      inspecteur: masika.nom,
      sexe_inspecteur: masika.sexe ?? '',
      poste_attache: masika.posteAttache ?? '',
      etablissement: epKitatumba.nom,
      enseignant: kyakimwaEsperance.nom,
      annee_scolaire: schoolYear,
      numero_rapport: 'RP-PILOTE-BUT-C3M-001',
    },
  });

  await seedSubmissionIfTemplateFound(templateRepo, submissionRepo, 'C3_DAS', {
    reportNumber: 'RP-PILOTE-BUT-C3DAS-001',
    schoolYear,
    etablissement: epButemboCentre,
    enseignant: kambaleChristian,
    inspecteur: kambale,
    header: {
      inspecteur: kambale.nom,
      sexe_inspecteur: kambale.sexe ?? '',
      poste_attache: kambale.posteAttache ?? '',
      etablissement: epButemboCentre.nom,
      enseignant: kambaleChristian.nom,
      annee_scolaire: schoolYear,
      numero_rapport: 'RP-PILOTE-BUT-C3DAS-001',
    },
  });

  await dataSource.destroy();

  console.log('\n✓ Jeu de données du pilote de Butembo (Nord-Kivu 2) créé.');
  console.log(
    '\nComptes de connexion pilote (mot de passe : "%s") :',
    DEMO_PASSWORD,
  );
  for (const user of users) {
    console.log(`  - ${user.email}  (${user.role})`);
  }
  console.log(
    '  - ige.nordkivu2@exemple.cd  (ige_admin, voit déjà toute la zone "Nord-Kivu 2" — voir seed-auth-and-directory.ts)',
  );
}

function inDays(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
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

async function upsertTrialSubscriber(
  repo: ReturnType<typeof dataSource.getRepository<SubscriberEntity>>,
  data: Partial<SubscriberEntity> & {
    accountType: 'etablissement' | 'inspecteur';
  },
): Promise<SubscriberEntity> {
  const existing = await repo.findOne({
    where: data.etablissementId
      ? { etablissementId: data.etablissementId }
      : { inspecteurId: data.inspecteurId as string },
  });
  // Ne pas écraser un état déjà avancé (essai consommé, abonnement actif...)
  // si ce script est relancé après une démonstration en direct.
  if (existing) {
    console.log(
      `= Abonnement déjà présent pour ce compte pilote (statut "${existing.status}") — inchangé.`,
    );
    return existing;
  }
  const entity = repo.create({ status: 'essai', ...data });
  const saved = await repo.save(entity);
  console.log(
    `✓ Essai gratuit démarré pour le compte pilote ${saved.accountType} (14 jours)`,
  );
  return saved;
}

/** Notes 0-4 fictives, réparties pour obtenir un score correct mais pas parfait. */
function fictionalScores(count: number): number[] {
  return Array.from({ length: count }, (_, i) => [4, 3, 3, 4][i % 4]);
}

async function seedSubmissionIfTemplateFound(
  templateRepo: ReturnType<typeof dataSource.getRepository<FormTemplateEntity>>,
  submissionRepo: ReturnType<
    typeof dataSource.getRepository<FormSubmissionEntity>
  >,
  formCode: FormCode,
  data: {
    reportNumber: string;
    schoolYear: string;
    etablissement: EtablissementEntity;
    enseignant?: EnseignantEntity;
    inspecteur: InspecteurEntity;
    header: FormHeaderValues;
  },
): Promise<void> {
  const template = await templateRepo.findOne({
    where: { code: formCode, isActive: true },
  });
  if (!template) {
    console.warn(
      `⚠ Aucun template actif "${formCode}" trouvé — avez-vous lancé "npm run seed:form-templates" avant ce script ? Formulaire pilote ignoré.`,
    );
    return;
  }

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

  const existing = await submissionRepo.findOne({
    where: { reportNumber: data.reportNumber },
  });
  const entity = existing ?? submissionRepo.create();
  entity.templateId = template.id;
  entity.formCode = template.code;
  entity.reportNumber = data.reportNumber;
  entity.schoolYear = data.schoolYear;
  entity.header = data.header;
  entity.sections = sections;
  entity.signatures = [];
  entity.status = 'soumis';
  entity.submittedAt = existing?.submittedAt ?? new Date();
  entity.etablissementId = data.etablissement.id;
  entity.enseignantId = data.enseignant?.id ?? null;
  entity.inspecteurId = data.inspecteur.id;
  entity.overallPercentage =
    overall.percentage !== null ? overall.percentage.toFixed(2) : null;
  entity.overallMention = overall.mention;

  const saved = await submissionRepo.save(entity);
  console.log(
    `✓ Formulaire pilote "${saved.reportNumber}" (${formCode}, ${existing ? 'mis à jour' : 'créé'}) — ${saved.overallMention} (${saved.overallPercentage}%)`,
  );
}

seed().catch((error) => {
  console.error('Échec du seed de démonstration Butembo :', error);
  process.exit(1);
});
