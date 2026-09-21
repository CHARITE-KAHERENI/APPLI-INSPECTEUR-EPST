import type {
  ConversionTable,
  FormFieldGroup,
  FormHeaderField,
  FormHeaderValues,
  FormSectionTemplate,
  FormTemplate,
} from '@c3-digital/shared';
import { computeSynthesisScore, SectionScoreResult } from '@c3-digital/shared';
import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PdfCustomObservation,
  PdfSectionResponse,
  PdfSubmissionInput,
} from './pdf-submission-input';

/** Couleurs officielles c3-digital (voir `mobile/lib/core/theme/app_colors.dart`). */
const COLORS = {
  primary: '#1F4E78',
  accent: '#2E74B5',
  positive: '#1E8E5A',
  warning: '#C77700',
  danger: '#C0392B',
  outline: '#B9C3CC',
  textMuted: '#5B6B79',
};

/** Note 0-4 -> couleur, même échelle que `AppColors.scoreScale` (mobile). */
const SCORE_COLORS = [
  COLORS.danger,
  COLORS.warning,
  COLORS.accent,
  COLORS.primary,
  COLORS.positive,
];

const LETTERHEAD = {
  country: 'REPUBLIQUE DEMOCRATIQUE DU CONGO',
  ministry: "Ministère de l'Education Nationale et Nouvelle Citoyenneté",
  service: 'INSPECTION GENERALE',
};

/**
 * Clés de champs d'en-tête ayant, par convention vérifiée sur les 5
 * formulaires officiels (`shared/forms/*.json`), une mise en forme
 * particulière plutôt qu'une ligne numérotée classique :
 * - `interesse` : liste verticale à droite du bloc d'identification
 *   (repérée par forme — un `select` à plus de 5 options — pas par clé,
 *   au cas où un futur formulaire nommerait ce champ différemment) ;
 * - `classification` : encart "M / P / S" isolé, à côté du code du
 *   formulaire ;
 * - les autres `select` sans `code` officiel (ex: `sexe_inspecteur`) sont
 *   rattachés en ligne à la fin du dernier champ numéroté qui les précède.
 */
const SIDE_LIST_MIN_OPTIONS = 6;
const CLASSIFICATION_KEY = 'classification';

const STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  soumis: 'Soumis',
  synchronise: 'Synchronisé',
};

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const text =
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
      ? String(value)
      : JSON.stringify(value);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Convertit du texte libre avec retours à la ligne en HTML sûr (une balise <br> par saut de ligne). */
function escapeMultiline(value: unknown): string {
  const escaped = escapeHtml(value);
  return escaped.replace(/\n/g, '<br>');
}

function formatHeaderValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '<span class="blank">—</span>';
  }
  return escapeHtml(value);
}

/** Découpe un code officiel ("2.11.3") en segments numériques comparables. */
function parseCode(code: string | undefined): number[] {
  if (!code) {
    return [0];
  }
  return code.split('.').map((part) => {
    const n = Number.parseInt(part, 10);
    return Number.isNaN(n) ? 0 : n;
  });
}

function compareCodes(a: string | undefined, b: string | undefined): number {
  const pa = parseCode(a);
  const pb = parseCode(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

function formatDateFr(iso: string | undefined): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day} / ${month} / ${date.getFullYear()}`;
}

/**
 * Construit le HTML complet d'un formulaire rempli, visuellement fidèle
 * aux documents Word officiels de l'IGE (en-tête RDC/ministère/logo,
 * bloc d'identification, grille d'évaluation par section, tableau de
 * conversion + évaluation synthétique, zone de signatures), pour
 * impression PDF via `PdfService` (`Puppeteer`).
 *
 * Générique sur les 5 formulaires (C2, C3, C3B, C3M, C3_DAS) : construit
 * entièrement à partir du `FormTemplate` (shared) et des données saisies,
 * sans logique spécifique à un formulaire donné — voir les commentaires
 * ci-dessus sur les conventions de mise en forme de l'en-tête.
 */
@Injectable()
export class PdfTemplateService {
  private readonly logoDataUri: string;

  constructor() {
    const logoPath = join(__dirname, 'assets', 'ige-logo.png');
    const logoBuffer = readFileSync(logoPath);
    this.logoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  }

  render(template: FormTemplate, submission: PdfSubmissionInput): string {
    const sectionsById = new Map(
      submission.sections.map((s) => [s.sectionId, s]),
    );

    const blocks: Array<{ code: string | undefined; html: string }> = [
      ...template.fieldGroups.map((group) => ({
        code: group.code,
        html: this.renderFieldGroup(group, submission.header),
      })),
      ...template.sections.map((section) => ({
        code: section.code,
        html: this.renderSection(section, sectionsById.get(section.id)),
      })),
    ];
    blocks.sort((a, b) => compareCodes(a.code, b.code));

    const bigTitle = template.name
      .replace(new RegExp(`^${escapeRegExp(template.code)}\\s*-\\s*`), '')
      .toUpperCase();

    const customObservationsHtml = this.renderCustomObservations(
      template,
      submission.sections,
    );

    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${escapeHtml(template.name)} — ${escapeHtml(submission.reportNumber)}</title>
<style>${this.css()}</style>
</head>
<body>
  <div class="doc">
    ${this.renderLetterhead(template, submission)}
    <div class="big-title">${escapeHtml(bigTitle)}</div>
    ${blocks.map((b) => b.html).join('\n')}
    ${this.renderSynthesisConversionSignatures(template, submission)}
    ${customObservationsHtml}
  </div>
</body>
</html>`;
  }

  // -----------------------------------------------------------------------
  // En-tête (lettre à en-tête RDC/ministère/logo + bloc d'identification)
  // -----------------------------------------------------------------------

  private renderLetterhead(
    template: FormTemplate,
    submission: PdfSubmissionInput,
  ): string {
    const fields = [...template.header.fields].sort(
      (a, b) => a.order - b.order,
    );

    const rows: string[] = [];
    let sideListField: FormHeaderField | null = null;
    let classificationField: FormHeaderField | null = null;
    let lastRowIndex = -1;

    for (const field of fields) {
      const value = submission.header[field.key];

      if (field.code) {
        rows.push(
          `<tr><td class="id-label">${escapeHtml(field.code)}. ${escapeHtml(field.label)}</td>` +
            `<td class="id-value">${formatHeaderValue(value)}</td></tr>`,
        );
        lastRowIndex = rows.length - 1;
        continue;
      }

      if (
        field.type === 'select' &&
        (field.options?.length ?? 0) >= SIDE_LIST_MIN_OPTIONS
      ) {
        sideListField = field;
        continue;
      }

      if (field.type === 'select' && field.key === CLASSIFICATION_KEY) {
        classificationField = field;
        continue;
      }

      // Champ satellite sans code officiel (ex: sexe de l'inspecteur) :
      // rattaché en ligne à la fin du dernier champ numéroté.
      if (lastRowIndex >= 0) {
        const chosen = field.options?.find((o) => o.value === value);
        const inline = `<span class="inline-field">${escapeHtml(field.label)} : <b>${chosen ? escapeHtml(chosen.label) : '—'}</b></span>`;
        rows[lastRowIndex] = rows[lastRowIndex].replace(
          '</td></tr>',
          ` ${inline}</td></tr>`,
        );
      }
    }

    const statusLabel = STATUS_LABELS[submission.status] ?? submission.status;

    return `
    <table class="letterhead">
      <tr>
        <td class="letterhead-brand">
          <div class="brand-country">${escapeHtml(LETTERHEAD.country)}</div>
          <div class="brand-ministry">${escapeHtml(LETTERHEAD.ministry)}</div>
          <img class="brand-logo" src="${this.logoDataUri}" alt="Logo IGE">
          <div class="brand-service">${escapeHtml(LETTERHEAD.service)}</div>
        </td>
        <td class="letterhead-identification">
          <table class="id-table">${rows.join('')}</table>
        </td>
        <td class="letterhead-side">
          ${sideListField ? this.renderSideList(sideListField, submission.header[sideListField.key]) : ''}
        </td>
        <td class="letterhead-code">
          <div class="form-code">${escapeHtml(template.code)}</div>
          <div class="status-badge">${escapeHtml(statusLabel)}</div>
          ${classificationField ? this.renderClassificationBox(classificationField, submission.header[classificationField.key]) : ''}
        </td>
      </tr>
    </table>`;
  }

  private renderSideList(field: FormHeaderField, value: unknown): string {
    const items = (field.options ?? [])
      .map((option) => {
        const selected = option.value === value;
        return `<div class="side-list-item${selected ? ' selected' : ''}">${selected ? '☑' : '☐'} ${escapeHtml(option.label)}</div>`;
      })
      .join('');
    return `<div class="side-list"><div class="side-list-title">${escapeHtml(field.label)}</div>${items}</div>`;
  }

  private renderClassificationBox(
    field: FormHeaderField,
    value: unknown,
  ): string {
    const items = (field.options ?? [])
      .map((option) => {
        const selected = option.value === value;
        return `<div class="classification-item${selected ? ' selected' : ''}">${escapeHtml(option.label)}</div>`;
      })
      .join('');
    return `<div class="classification-box">${items}</div>`;
  }

  // -----------------------------------------------------------------------
  // Groupes de champs non notés (ex: "1. Activité(s) inspectée(s)")
  // -----------------------------------------------------------------------

  private renderFieldGroup(
    group: FormFieldGroup,
    header: FormHeaderValues,
  ): string {
    const shortFields = group.fields.filter((f) => f.type !== 'textarea');
    const longFields = group.fields.filter((f) => f.type === 'textarea');

    const shortTable = shortFields.length
      ? `<table class="fg-table">
          <tr>${shortFields.map((f) => `<th>${escapeHtml(f.label)}</th>`).join('')}</tr>
          <tr>${shortFields.map((f) => `<td>${this.renderFieldValue(f, header[f.key])}</td>`).join('')}</tr>
        </table>`
      : '';

    const longBlocks = longFields
      .map(
        (f) => `<div class="fg-textarea">
          <div class="fg-textarea-label">${escapeHtml(f.label)}</div>
          <div class="fg-textarea-value">${escapeMultiline(header[f.key]) || '<span class="blank">—</span>'}</div>
        </div>`,
      )
      .join('');

    return `<div class="field-group">
      <div class="field-group-title">${group.code ? `${escapeHtml(group.code)}. ` : ''}${escapeHtml(group.title)}</div>
      ${group.description ? `<div class="field-group-desc">${escapeHtml(group.description)}</div>` : ''}
      ${shortTable}
      ${longBlocks}
    </div>`;
  }

  private renderFieldValue(field: FormHeaderField, value: unknown): string {
    if (field.type === 'select') {
      const chosen = field.options?.find((o) => o.value === value);
      const scale = (field.options ?? []).map((o) => o.label).join(' / ');
      return `<div>${chosen ? `<b>${escapeHtml(chosen.label)}</b>` : '<span class="blank">—</span>'}</div><div class="muted small">${escapeHtml(scale)}</div>`;
    }
    return formatHeaderValue(value);
  }

  // -----------------------------------------------------------------------
  // Sections notées (grille d'évaluation)
  // -----------------------------------------------------------------------

  private renderSection(
    section: FormSectionTemplate,
    response: PdfSectionResponse | undefined,
  ): string {
    const responsesById = new Map(
      (response?.criteria ?? []).map((c) => [c.criterionId, c]),
    );
    const maxScore = section.criteria.reduce(
      (sum, c) => sum + c.maxScore * (c.weight ?? 1),
      0,
    );

    const rows = section.criteria
      .map((criterion) => {
        const answer = responsesById.get(criterion.id);
        const score = answer?.score;
        const scoreCell =
          score === undefined || score === null
            ? '<span class="blank">—</span>'
            : `<span class="score-pill" style="background:${SCORE_COLORS[score]}">${score}</span>`;
        return `<tr>
          <td class="crit-code">${escapeHtml(criterion.code ?? '')}</td>
          <td class="crit-label">${escapeHtml(criterion.label)}</td>
          <td class="crit-obs">${escapeMultiline(answer?.comment)}</td>
          <td class="crit-score">${scoreCell}</td>
        </tr>`;
      })
      .join('');

    const totalScore = response?.totalScore ?? 0;
    const mention = response?.mention;
    const percentage = response?.percentage;

    return `<div class="section-block">
      <div class="section-title">${escapeHtml(section.code)}. ${escapeHtml(section.title)}</div>
      ${section.description ? `<div class="section-desc">${escapeHtml(section.description)}</div>` : ''}
      <table class="criteria-table">
        <thead><tr>
          <th class="col-code">Code</th>
          <th class="col-label">Critère</th>
          <th class="col-obs">${escapeHtml(section.observationsLabel)}</th>
          <th class="col-score">0-4</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="section-total">
        ← Conversion : <b>${mention ? escapeHtml(mention) : '—'}</b>${percentage !== undefined ? ` (${percentage}%)` : ''}
        &nbsp;&nbsp;—&nbsp;&nbsp;
        Total → <b>${totalScore} / ${response?.maxScore ?? maxScore}</b>
      </div>
      ${
        section.adviceZone.enabled
          ? `<div class="advice-box">
              <div class="advice-label">${escapeHtml(section.adviceZone.label)}</div>
              <div class="advice-value">${escapeMultiline(response?.advice) || '<span class="blank">—</span>'}</div>
            </div>`
          : ''
      }
    </div>`;
  }

  // -----------------------------------------------------------------------
  // Tableau de conversion + évaluation synthétique + signatures
  // -----------------------------------------------------------------------

  private renderSynthesisConversionSignatures(
    template: FormTemplate,
    submission: PdfSubmissionInput,
  ): string {
    const { synthesis, conversionTable } = template;
    const sectionsById = new Map(
      submission.sections.map((s) => [s.sectionId, s]),
    );

    const bandByMention = new Map(
      conversionTable.bands.map((b) => [b.mention, b]),
    );
    const sectionScores: Record<string, SectionScoreResult> = {};
    for (const row of synthesis.rows) {
      const response = sectionsById.get(row.sectionId);
      const band = response?.mention
        ? bandByMention.get(response.mention)
        : undefined;
      sectionScores[row.sectionId] = {
        totalScore: response?.totalScore ?? 0,
        maxScore: response?.maxScore ?? 0,
        percentage: response?.percentage ?? 0,
        mention: response?.mention ?? '',
        scoreOn4: band?.scoreOn4,
      };
    }

    const synthesisRows = synthesis.rows
      .map((row) => {
        const scoreOn4 = sectionScores[row.sectionId]?.scoreOn4;
        const cell =
          scoreOn4 === undefined
            ? '<span class="blank">—</span>'
            : `<span class="score-pill" style="background:${SCORE_COLORS[scoreOn4]}">${scoreOn4}</span>`;
        return `<tr><td>${escapeHtml(row.label)}</td><td class="synth-score">${cell}</td></tr>`;
      })
      .join('');

    let finalResult: {
      scoreOn4: number;
      percentage: number;
      mention: string;
    } | null = null;
    try {
      finalResult = computeSynthesisScore(template, sectionScores);
    } catch {
      finalResult = null;
    }

    const conversionTableHtml = this.renderConversionTable(conversionTable);
    const signaturesHtml = this.renderSignatures(template, submission);

    return `<div class="synthesis-row">
      <div class="synthesis-col">
        <table class="synthesis-table">
          <thead><tr><th>${escapeHtml(synthesis.title)}</th><th>Note/4</th></tr></thead>
          <tbody>${synthesisRows}</tbody>
        </table>
        <div class="final-mention">
          <div class="final-mention-label">${escapeHtml(synthesis.finalMentionLabel)}</div>
          ${synthesis.finalMentionHelpText ? `<div class="muted small">${escapeHtml(synthesis.finalMentionHelpText)}</div>` : ''}
          <div class="final-mention-value" style="color:${finalResult ? SCORE_COLORS[finalResult.scoreOn4] : COLORS.textMuted}">
            ${finalResult ? escapeHtml(finalResult.mention) : '—'}
            ${finalResult ? `<span class="muted small">(${finalResult.percentage}%)</span>` : ''}
          </div>
          ${synthesis.sealLabel ? `<div class="seal-box">${escapeHtml(synthesis.sealLabel)}</div>` : ''}
        </div>
      </div>
      <div class="conversion-col">
        <div class="conversion-title">Tableau de conversion</div>
        ${conversionTableHtml}
      </div>
      <div class="signatures-col">
        <div class="signatures-title">Signatures</div>
        ${signaturesHtml}
      </div>
    </div>`;
  }

  private renderConversionTable(table: ConversionTable): string {
    const bands = table.bands;
    if (table.mode === 'percentage_only') {
      const hasSecondary = bands.some((b) => b.secondaryMention);
      return `<table class="conversion-table">
        <tr><th>Note/4</th><th>%</th><th>Mention</th>${hasSecondary ? '<th>Appréciation globale</th>' : ''}</tr>
        ${bands
          .map(
            (b) =>
              `<tr><td>${b.scoreOn4}</td><td>${b.minPercentage} – ${b.maxPercentage}</td><td>${escapeHtml(b.mention)}</td>${
                hasSecondary
                  ? `<td>${escapeHtml(b.secondaryMention ?? '')}</td>`
                  : ''
              }</tr>`,
          )
          .join('')}
      </table>`;
    }

    const rows = [...(table.rows ?? [])].sort(
      (a, b) => a.criteriaCount - b.criteriaCount,
    );
    return `<table class="conversion-table">
      <tr><th>NOTE</th>${bands.map((b) => `<th>${b.scoreOn4}</th>`).join('')}</tr>
      <tr><td>%</td>${bands.map((b) => `<td>${b.minPercentage} – ${b.maxPercentage}</td>`).join('')}</tr>
      ${rows
        .map(
          (row) =>
            `<tr><td>${row.criteriaCount}</td>${row.ranges.map((r) => `<td>${r.min} – ${r.max}</td>`).join('')}</tr>`,
        )
        .join('')}
      <tr class="mention-row"><td>MENTION</td>${bands.map((b) => `<td>${escapeHtml(b.mention)}</td>`).join('')}</tr>
    </table>`;
  }

  private renderSignatures(
    template: FormTemplate,
    submission: PdfSubmissionInput,
  ): string {
    const roles = [...template.signatures.roles].sort(
      (a, b) => a.order - b.order,
    );
    const byRole = new Map(submission.signatures.map((s) => [s.role, s]));

    return roles
      .map((roleTemplate) => {
        const signature = byRole.get(roleTemplate.role);
        const dateLabel =
          formatDateFr(signature?.signedAt) ?? '..... / ..... / ..........';
        const placeLabel = signature?.place
          ? escapeHtml(signature.place)
          : '..........................';
        const nameLabel = signature?.signedByName
          ? escapeHtml(signature.signedByName)
          : '..........................';

        return `<div class="signature-block">
          <div class="signature-role">${escapeHtml(roleTemplate.label)}</div>
          <div class="signature-line">Fait à ${placeLabel}, le ${dateLabel}</div>
          <div class="signature-line">Nom : ${nameLabel}</div>
          ${
            signature?.signatureImageBase64
              ? `<img class="signature-img" src="data:image/png;base64,${signature.signatureImageBase64}" alt="Signature">`
              : '<div class="signature-empty">(non signé)</div>'
          }
        </div>`;
      })
      .join('');
  }

  // -----------------------------------------------------------------------
  // Observations complémentaires de l'inspecteur (hors grille officielle)
  // -----------------------------------------------------------------------

  private renderCustomObservations(
    template: FormTemplate,
    sections: PdfSectionResponse[],
  ): string {
    const sectionLabelById = new Map(
      template.sections.map((s) => [s.id, `${s.code}. ${s.title}`]),
    );

    const entries: Array<{
      sectionLabel: string;
      observation: PdfCustomObservation;
    }> = [];
    for (const section of sections) {
      for (const observation of section.customObservations ?? []) {
        entries.push({
          sectionLabel:
            sectionLabelById.get(section.sectionId) ?? section.sectionId,
          observation,
        });
      }
    }

    if (entries.length === 0) {
      return '';
    }

    const rows = entries
      .map(
        (entry) => `<tr>
          <td class="custom-obs-section">${escapeHtml(entry.sectionLabel)}</td>
          <td class="custom-obs-label">${escapeHtml(entry.observation.label) || '<span class="blank">—</span>'}</td>
          <td class="custom-obs-note">${escapeMultiline(entry.observation.note)}</td>
        </tr>`,
      )
      .join('');

    return `<div class="custom-observations">
      <div class="custom-observations-title">Observations complémentaires de l'inspecteur (hors grille officielle)</div>
      <table class="custom-observations-table">
        <thead><tr><th>Section</th><th>Observation</th><th>Note</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  // -----------------------------------------------------------------------
  // Styles
  // -----------------------------------------------------------------------

  private css(): string {
    return `
      * { box-sizing: border-box; }
      body {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        font-size: 9.5px;
        color: #1A1F24;
        margin: 0;
      }
      .doc { padding: 4px; }
      .muted { color: ${COLORS.textMuted}; }
      .small { font-size: 8px; }
      .blank { color: ${COLORS.textMuted}; }

      table { border-collapse: collapse; width: 100%; }
      td, th { border: 1px solid ${COLORS.outline}; padding: 2px 4px; vertical-align: top; text-align: left; }

      /* --- Lettre à en-tête --- */
      .letterhead td { border: 1.5px solid #1A1F24; vertical-align: top; }
      .letterhead-brand { width: 22%; text-align: center; padding: 6px; }
      .brand-country { font-weight: 700; font-size: 10.5px; }
      .brand-ministry { font-weight: 700; font-size: 8.5px; margin-top: 2px; }
      .brand-logo { width: 60px; margin: 4px auto; display: block; }
      .brand-service { font-weight: 700; font-size: 10.5px; margin-top: 2px; }

      .letterhead-identification { width: 46%; padding: 0; }
      .id-table td { border: none; border-bottom: 1px solid ${COLORS.outline}; padding: 1.5px 4px; }
      .id-table tr:last-child td { border-bottom: none; }
      .id-label { font-weight: 600; width: 55%; white-space: nowrap; }
      .id-value { }
      .inline-field { margin-left: 8px; white-space: nowrap; }

      .letterhead-side { width: 17%; padding: 2px; }
      .side-list-title { font-weight: 700; font-style: italic; font-size: 8px; margin-bottom: 2px; }
      .side-list-item { font-style: italic; font-size: 8px; padding: 1px 0; }
      .side-list-item.selected { font-weight: 700; font-style: normal; color: ${COLORS.primary}; }

      .letterhead-code { width: 15%; text-align: center; padding: 4px; }
      .form-code { font-weight: 800; font-size: 22px; color: ${COLORS.primary}; }
      .status-badge {
        display: inline-block; margin-top: 4px; padding: 1px 6px; border-radius: 8px;
        font-size: 7.5px; font-weight: 700; color: #fff; background: ${COLORS.accent};
      }
      .classification-box { margin-top: 10px; }
      .classification-item {
        border: 1px solid ${COLORS.outline}; font-weight: 700; padding: 2px; margin-top: 2px;
      }
      .classification-item.selected { background: ${COLORS.primary}; color: #fff; }

      .big-title {
        text-align: center; font-weight: 800; font-size: 15px; letter-spacing: 0.5px;
        border: 1.5px solid #1A1F24; border-top: none; padding: 4px; margin-bottom: 4px;
      }

      /* --- Groupes de champs non notés --- */
      .field-group { border: 1.5px solid #1A1F24; border-top: none; padding: 3px 5px; margin-bottom: 2px; }
      .field-group-title { font-weight: 700; font-size: 10px; margin-bottom: 2px; }
      .field-group-desc { font-style: italic; color: ${COLORS.textMuted}; margin-bottom: 2px; }
      .fg-table th { background: #EEF2F5; font-size: 8.5px; text-align: center; }
      .fg-table td { text-align: center; min-height: 14px; }
      .fg-textarea { margin-top: 3px; }
      .fg-textarea-label { font-weight: 600; font-size: 8.5px; }
      .fg-textarea-value { border: 1px solid ${COLORS.outline}; min-height: 24px; padding: 2px 4px; margin-top: 1px; }

      /* --- Sections notées --- */
      .section-block { border: 1.5px solid #1A1F24; border-top: none; padding: 3px 5px 5px; page-break-inside: avoid; }
      .section-title { font-weight: 700; font-size: 10.5px; background: #EEF2F5; padding: 2px 4px; margin: 0 -5px 3px; }
      .section-desc { font-style: italic; color: ${COLORS.textMuted}; margin-bottom: 3px; }
      .criteria-table thead th { background: #F6F8FA; font-size: 8.5px; text-align: center; }
      .col-code { width: 8%; text-align: center; }
      .col-label { width: 32%; }
      .col-obs { width: 45%; }
      .col-score { width: 8%; text-align: center; }
      .crit-code { font-style: italic; color: ${COLORS.textMuted}; text-align: center; }
      .crit-label { font-style: italic; }
      .crit-score { text-align: center; }
      .score-pill {
        display: inline-block; min-width: 14px; padding: 1px 5px; border-radius: 8px;
        color: #fff; font-weight: 700; text-align: center;
      }
      .section-total { margin-top: 3px; text-align: right; font-size: 9px; }
      .advice-box { border: 1px solid ${COLORS.outline}; margin-top: 3px; padding: 2px 4px; min-height: 20px; }
      .advice-label { font-weight: 700; font-size: 8.5px; }
      .advice-value { margin-top: 1px; }

      /* --- Synthèse / conversion / signatures --- */
      .synthesis-row { display: flex; border: 1.5px solid #1A1F24; border-top: none; page-break-inside: avoid; }
      .synthesis-col, .conversion-col, .signatures-col { flex: 1; padding: 3px 5px; }
      .synthesis-col { border-right: 1.5px solid #1A1F24; }
      .conversion-col { border-right: 1.5px solid #1A1F24; }
      .synthesis-table th { background: #EEF2F5; font-size: 8.5px; }
      .synth-score { text-align: center; width: 20%; }
      .final-mention { margin-top: 6px; border-top: 2px solid #1A1F24; padding-top: 4px; }
      .final-mention-label { font-weight: 800; font-size: 12px; }
      .final-mention-value { font-weight: 800; font-size: 16px; margin-top: 2px; }
      .seal-box { margin-top: 8px; border: 1px dashed ${COLORS.outline}; padding: 10px 4px; text-align: center; color: ${COLORS.textMuted}; font-style: italic; }

      .conversion-title, .signatures-title { font-weight: 700; font-size: 10px; margin-bottom: 3px; text-align: center; }
      .conversion-table th, .conversion-table td { text-align: center; font-size: 7.8px; padding: 1.5px 2px; }
      .conversion-table .mention-row td { font-weight: 700; }

      .signature-block { border-top: 1px solid ${COLORS.outline}; padding: 4px 0; }
      .signature-block:first-child { border-top: none; }
      .signature-role { font-weight: 700; font-style: italic; }
      .signature-line { margin-top: 2px; }
      .signature-img { max-width: 100%; max-height: 40px; margin-top: 3px; }
      .signature-empty { color: ${COLORS.textMuted}; font-style: italic; margin-top: 3px; }

      /* --- Observations complémentaires (hors grille officielle) --- */
      .custom-observations {
        margin-top: 6px; border: 2px solid ${COLORS.warning}; page-break-inside: avoid;
      }
      .custom-observations-title {
        background: ${COLORS.warning}; color: #fff; font-weight: 700; padding: 4px 6px; font-size: 10px;
      }
      .custom-observations-table { }
      .custom-observations-table th { background: #FBF0E2; font-size: 8.5px; }
      .custom-obs-section { width: 30%; font-weight: 600; }
      .custom-obs-label { width: 25%; }
    `;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
