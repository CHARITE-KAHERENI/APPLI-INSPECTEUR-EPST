import type {
  CriterionResponse,
  FormTemplate,
  SectionResponse,
} from '@c3-digital/shared';
import { computeSectionScore } from '@c3-digital/shared';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { computeOverallScore } from './overall-score.util';

/**
 * Calcul des scores et mentions pour les 5 formulaires officiels
 * (PROMPT 9, point 1) — exerce `computeSectionScore`/`computeOverallScore`
 * (le même algorithme que le web, le PDF serveur et son miroir Dart côté
 * mobile) directement contre les 5 configurations JSON réelles de
 * `shared/forms`, sans passer par la base de données : ce sont des tests
 * unitaires purs sur la logique de notation elle-même.
 */
const SHARED_FORMS_DIR = join(__dirname, '../../../../shared/forms');
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

/** Construit les réponses d'une section avec la même note (0 à 4) sur tous les critères. */
function uniformResponses(
  section: FormTemplate['sections'][number],
  score: 0 | 1 | 2 | 3 | 4,
): CriterionResponse[] {
  return section.criteria.map((criterion) => ({
    criterionId: criterion.id,
    score,
  }));
}

function computeAllSections(
  template: FormTemplate,
  score: 0 | 1 | 2 | 3 | 4,
): SectionResponse[] {
  return template.sections.map((section) => {
    const responses = uniformResponses(section, score);
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
    };
  });
}

describe.each(FORM_FILES)('Calcul des scores — %s', (fileName) => {
  const template = loadTemplate(fileName);

  it('note maximale sur toutes les sections -> 100%% et la meilleure mention du barème', () => {
    const sections = computeAllSections(template, 4);
    for (const section of sections) {
      expect(section.percentage).toBe(100);
    }

    const overall = computeOverallScore(template, sections);
    expect(overall.percentage).toBe(100);

    // La meilleure mention du barème est celle dont scoreOn4 est le plus élevé (généralement "ELITE").
    const bestBand = [...template.conversionTable.bands].sort(
      (a, b) => b.scoreOn4 - a.scoreOn4,
    )[0];
    expect(overall.mention).toBe(bestBand.mention);
  });

  it('note minimale sur toutes les sections -> 0%% et la plus faible mention du barème', () => {
    const sections = computeAllSections(template, 0);
    for (const section of sections) {
      expect(section.percentage).toBe(0);
    }

    const overall = computeOverallScore(template, sections);
    expect(overall.percentage).toBe(0);

    const worstBand = [...template.conversionTable.bands].sort(
      (a, b) => a.scoreOn4 - b.scoreOn4,
    )[0];
    expect(overall.mention).toBe(worstBand.mention);
  });

  it('un critère inconnu lève une erreur explicite (ne doit jamais être avalée silencieusement au niveau section)', () => {
    const [firstSection] = template.sections;
    expect(() =>
      computeSectionScore(
        firstSection,
        [{ criterionId: 'critere-inexistant', score: 4 }],
        template.conversionTable,
      ),
    ).toThrow(/Critère inconnu/);
  });

  it("un formulaire incomplet (sections manquantes) ne lève jamais d'exception (dégradation gracieuse)", () => {
    // Un brouillon dont aucune section n'est encore notée ne doit jamais faire
    // échouer l'enregistrement : computeOverallScore renvoie soit un résultat
    // complet (0%, pire mention — 0 étant une note brute valide pour la
    // plupart des formulaires), soit { percentage: null, mention: null } si le
    // barème du formulaire ne couvre pas ce cas — jamais une exception, et
    // jamais l'un sans l'autre.
    expect(() => computeOverallScore(template, [])).not.toThrow();
    const overall = computeOverallScore(template, []);
    expect(overall.percentage === null).toBe(overall.mention === null);
  });
});
