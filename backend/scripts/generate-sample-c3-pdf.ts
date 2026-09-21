import type {
  CriterionResponse,
  FormTemplate,
  SectionResponse,
  SignatureResponse,
} from '@c3-digital/shared';
import { computeSectionScore } from '@c3-digital/shared';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PdfSectionResponse, PdfSubmissionInput } from '../src/modules/pdf/pdf-submission-input';
import { PdfTemplateService } from '../src/modules/pdf/pdf-template.service';
import { PdfService } from '../src/modules/pdf/pdf.service';

/**
 * Génère un PDF d'exemple du formulaire C3 à partir de données
 * entièrement fictives, pour validation visuelle de la fidélité au
 * document Word officiel (voir PROMPT 5).
 *
 * N'exige ni base de données ni serveur Nest démarré : instancie
 * directement `PdfTemplateService`/`PdfService` (le même moteur que
 * `GET /form-submissions/:id/pdf`) à partir du template lu dans
 * `shared/forms/c3.json`.
 *
 * Usage : npm run generate:sample-pdf
 */

const SHARED_FORMS_DIR = join(__dirname, '../../shared/forms');
const OUTPUT_DIR = join(__dirname, '../tmp');
const OUTPUT_PATH = join(OUTPUT_DIR, 'c3-sample.pdf');

function loadTemplate(): FormTemplate {
  const raw = readFileSync(join(SHARED_FORMS_DIR, 'c3.json'), 'utf-8');
  return JSON.parse(raw) as FormTemplate;
}

/** Notes 0-4 fictives par critère, section par section (ordre des criteria dans c3.json). */
const SAMPLE_SCORES: Record<string, number[]> = {
  'c3-s21': [4, 3, 4, 3, 4, 4, 3, 4],
  'c3-s22': [4, 4, 3, 4, 4],
  'c3-s23': [3, 4, 3, 3, 4],
  'c3-s24': [4, 3, 4, 4, 3, 4, 4],
  'c3-s25': [3, 3, 4, 3],
  'c3-s26': [4, 4, 3],
  'c3-s27': [2, 3, 2, 3, 3],
  'c3-s28': [3, 3, 4, 3, 3, 4],
  'c3-s29': [4, 4, 3, 4, 4, 3, 4, 4, 3],
  'c3-s210': [3, 3, 4, 3],
};

/** Conseils fictifs pour quelques sections (les autres restent vides, comme dans un vrai rapport). */
const SAMPLE_ADVICE: Record<string, string> = {
  'c3-s21': "Continuer à soigner la présentation et l'élocution ; veiller à une tenue de classe plus ferme.",
  'c3-s27': "Diversifier davantage les travaux de groupe pour mieux impliquer les apprenants les plus discrets.",
  'c3-s210':
    "Prévoir systématiquement une évaluation progressive en cours de séquence, pas seulement en fin de leçon.",
};

/** Observations par critère, sur quelques critères seulement (comme dans un vrai rapport). */
const SAMPLE_CRITERION_COMMENTS: Record<string, string> = {
  'c3-c21-3': 'Autorité naturelle, classe attentive dès le début de la leçon.',
  'c3-c24-3': "Inscription au journal des apprenants incomplète pour la séance du jour.",
  'c3-c27-1': "Peu de relances vers les apprenants les moins participatifs.",
  'c3-c29-7': "Livre de l'enseignant à jour et bien tenu.",
};

function buildSections(template: FormTemplate): PdfSectionResponse[] {
  return template.sections.map((section) => {
    const scores = SAMPLE_SCORES[section.id] ?? section.criteria.map(() => 3);
    const responses: CriterionResponse[] = section.criteria.map((criterion, index) => ({
      criterionId: criterion.id,
      score: scores[index] as CriterionResponse['score'],
      comment: SAMPLE_CRITERION_COMMENTS[criterion.id],
    }));

    const result = computeSectionScore(section, responses, template.conversionTable);

    const sectionResponse: PdfSectionResponse = {
      sectionId: section.id,
      criteria: responses,
      totalScore: result.totalScore,
      maxScore: result.maxScore,
      percentage: result.percentage,
      mention: result.mention,
      advice: SAMPLE_ADVICE[section.id],
    };

    // Observations complémentaires (hors grille officielle) — sur deux
    // sections seulement, pour tester l'encart de fin de document.
    if (section.id === 'c3-s21') {
      sectionResponse.customObservations = [
        {
          id: 'obs-1',
          label: 'Ponctualité',
          note: "L'enseignant est arrivé 10 minutes avant le début de la leçon pour préparer le tableau.",
        },
      ];
    }
    if (section.id === 'c3-s27') {
      sectionResponse.customObservations = [
        {
          id: 'obs-2',
          label: 'Climat de classe',
          note: 'Bonne entraide entre apprenants observée lors du travail de groupe, en dehors de la grille officielle.',
        },
      ];
    }

    return sectionResponse;
  });
}

function buildSignatures(): SignatureResponse[] {
  const signatureImageBase64 = readFileSync(join(__dirname, 'fixtures/sample-signature.png')).toString('base64');

  return [
    {
      role: 'enseignant',
      signedByName: 'MUKENDI Jean (fictif)',
      signedAt: '2026-08-14T09:45:00.000Z',
      place: 'Lubumbashi',
      signatureImageBase64,
    },
    {
      role: 'chef_etablissement',
      signedByName: 'KABEYA Marie (fictive)',
      signedAt: '2026-08-14T10:05:00.000Z',
      place: 'Lubumbashi',
      signatureImageBase64,
    },
    // Inspecteur : volontairement non signé, pour valider le rendu "(non signé)".
    { role: 'inspecteur' },
  ];
}

function buildSubmission(template: FormTemplate): PdfSubmissionInput {
  const sections = buildSections(template);

  return {
    formCode: template.code,
    reportNumber: 'RP-2026-000123',
    schoolYear: '2025-2026',
    header: {
      inspecteur: 'TSHISEKEDI Paul (fictif)',
      sexe_inspecteur: 'M',
      niveau_discipline: 'Secondaire / Mathématiques',
      poste_attache: 'Inspection Provinciale du Haut-Katanga',
      bp: '1234 - Lubumbashi',
      telephone_email: '+243 900 000 000 - paul.tshisekedi@exemple.cd',
      etablissement: "Institut de la Paix (établissement fictif)",
      enseignant: 'MUKENDI Jean (fictif)',
      dernier_c3: 'Inspecteur : KALALA Eric (fictif) - Date : 12/03/2025 - Cote : Bon',
      charge_hebdomadaire: '22 heures',
      annee_scolaire: '2025-2026',
      numero_rapport: 'RP-2026-000123',
      interesse: 'IGE',
      classification: 'M',
      branche: 'Mathématiques',
      classe: '4e Humanités Scientifiques',
      heure: '08h00 - 08h50',
      effectif_p_i: '42 P / 1 I',
      sujet: 'Résolution des équations du second degré à une inconnue',
    },
    sections,
    signatures: buildSignatures(),
    status: 'soumis',
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const template = loadTemplate();
  const submission = buildSubmission(template);

  const templateService = new PdfTemplateService();
  const html = templateService.render(template, submission);

  const pdfService = new PdfService();
  try {
    const pdfBuffer = await pdfService.generatePdf(html);

    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(OUTPUT_PATH, pdfBuffer);
    // Conservé également pour inspection visuelle rapide du HTML brut, en
    // complément du PDF (utile pour ajuster le CSS sans relancer Chromium).
    writeFileSync(join(OUTPUT_DIR, 'c3-sample.html'), html);

    console.log(`✓ PDF généré : ${OUTPUT_PATH} (${(pdfBuffer.length / 1024).toFixed(1)} Ko)`);
  } finally {
    await pdfService.onModuleDestroy();
  }
}

main().catch((error) => {
  console.error('Échec de la génération du PDF exemple :', error);
  process.exitCode = 1;
});
