import type {
  CriterionResponse,
  FormTemplate,
  SignatureResponse,
} from '@c3-digital/shared';
import { computeSectionScore } from '@c3-digital/shared';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PdfSectionResponse, PdfSubmissionInput } from './pdf-submission-input';
import { PdfTemplateService } from './pdf-template.service';

/**
 * Génération PDF — comparaison avec un document de référence (PROMPT 9,
 * point 1). `PdfTemplateService.render()` est une fonction pure (aucun
 * navigateur requis — la conversion HTML -> PDF elle-même, via
 * Puppeteer/Chromium, reste validée visuellement par
 * `npm run generate:sample-pdf`, voir `backend/README.md`) : ce test
 * compare le HTML généré, byte pour byte (hors horodatage de pied de
 * page), à une référence "golden" committée dans
 * `test/fixtures/pdf-golden/<code>.html` pour chacun des 5 formulaires —
 * toute régression visuelle (structure, libellés, mise en forme) fait
 * échouer le test.
 *
 * Premier lancement (aucune référence committée) : le fichier de
 * référence est créé automatiquement — relire le diff généré avant de le
 * committer, exactement comme on validerait un nouveau PDF de référence.
 */
const SHARED_FORMS_DIR = join(__dirname, '../../../../shared/forms');
const GOLDEN_DIR = join(__dirname, '../../../test/fixtures/pdf-golden');
const FORM_FILES = [
  'c2.json',
  'c3.json',
  'c3b.json',
  'c3m.json',
  'c3_das.json',
];

function loadTemplate(fileName: string): FormTemplate {
  const raw = readFileSync(join(SHARED_FORMS_DIR, fileName), 'utf-8');
  return JSON.parse(raw) as FormTemplate;
}

/** Une valeur d'en-tête générique et déterministe par type de champ, pour un rendu structurellement complet. */
function genericHeaderValue(
  field: FormTemplate['header']['fields'][number],
): string {
  if (field.type === 'select' && field.options?.length) {
    return field.options[0].value;
  }
  return `Valeur de test — ${field.label}`;
}

function buildGenericSubmission(template: FormTemplate): PdfSubmissionInput {
  const header: Record<string, string> = {};
  for (const field of template.header.fields) {
    header[field.key] = genericHeaderValue(field);
  }

  const sections: PdfSectionResponse[] = template.sections.map((section) => {
    const responses: CriterionResponse[] = section.criteria.map(
      (criterion) => ({
        criterionId: criterion.id,
        score: 3,
      }),
    );
    const result = computeSectionScore(
      section,
      responses,
      template.conversionTable,
    );
    return {
      sectionId: section.id,
      criteria: responses,
      totalScore: result.totalScore,
      maxScore: result.maxScore,
      percentage: result.percentage,
      mention: result.mention,
      advice: section.adviceZone.enabled
        ? 'Conseil de test généré automatiquement.'
        : undefined,
    };
  });

  const signatures: SignatureResponse[] = template.signatures.roles.map(
    (role) => ({ role: role.role }),
  );

  return {
    formCode: template.code,
    reportNumber: 'RP-TEST-000001',
    schoolYear: '2025-2026',
    header,
    sections,
    signatures,
    status: 'soumis',
    // Fixe (pas `new Date()`) pour que le HTML généré soit reproductible
    // d'un lancement à l'autre et comparable à la référence committée.
    generatedAt: '2026-01-01T00:00:00.000Z',
  };
}

/** Retire les fragments non déterministes (aucun ici tant que `generatedAt` est fixé, mais garde le test robuste si ça change). */
function normalize(html: string): string {
  return html.trim();
}

/** Même échappement HTML que `PdfTemplateService` (voir `escapeHtml`), pour comparer un libellé brut au HTML généré. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

describe.each(FORM_FILES)('Génération PDF — %s', (fileName) => {
  const template = loadTemplate(fileName);
  const service = new PdfTemplateService();
  let html: string;

  beforeAll(() => {
    const submission = buildGenericSubmission(template);
    html = service.render(template, submission);
  });

  it('contient les repères structurels attendus (en-tête, sections, synthèse, signatures)', () => {
    expect(html).toContain(template.code);
    for (const section of template.sections) {
      expect(html).toContain(escapeHtml(section.title));
    }
    expect(html).toContain('Tableau de conversion');
    for (const role of template.signatures.roles) {
      expect(html).toContain(escapeHtml(role.label ?? role.role));
    }
  });

  it('correspond au HTML de référence (golden) — toute différence est une régression visuelle à valider explicitement', () => {
    mkdirSync(GOLDEN_DIR, { recursive: true });
    const goldenPath = join(GOLDEN_DIR, fileName.replace('.json', '.html'));

    if (!existsSync(goldenPath)) {
      writeFileSync(goldenPath, html);

      console.warn(
        `⚠ Référence PDF créée : ${goldenPath} — vérifiez-la puis committez-la.`,
      );
      return;
    }

    const golden = readFileSync(goldenPath, 'utf-8');
    expect(normalize(html)).toBe(normalize(golden));
  });
});
