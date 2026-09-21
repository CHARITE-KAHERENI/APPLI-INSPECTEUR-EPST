const FORM_LABELS: Record<string, string> = {
  C2: 'C2 — Inspection administrative',
  C3: 'C3 — Leçon théorique',
  C3B: 'C3B — Leçon pratique',
  C3M: 'C3M — Enseignement maternel',
  C3_DAS: 'C3_DAS — Séquence didactique',
};

export function formCodeLabel(formCode: string): string {
  return FORM_LABELS[formCode] ?? formCode;
}
