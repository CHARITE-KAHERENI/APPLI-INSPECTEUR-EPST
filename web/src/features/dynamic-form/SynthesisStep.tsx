import type { ConversionResult, FormTemplate, SectionScoreResult, SignatoryRole } from '@c3-digital/shared';
import { MentionBadge } from '../../components/MentionBadge';
import { SignaturePad } from './SignaturePad';
import type { SignatureDraftMap } from './types';

const SIGNATORY_LABELS: Record<SignatoryRole, string> = {
  enseignant: 'Enseignant(e)',
  chef_etablissement: "Chef d'établissement",
  inspecteur: 'Inspecteur',
};

export function SynthesisStep({
  template,
  allSectionScores,
  overallScore,
  signatures,
  onSigned,
  onCleared,
  onPlaceChanged,
  onSignedByNameChanged,
}: {
  template: FormTemplate;
  allSectionScores: Record<string, SectionScoreResult>;
  overallScore: ConversionResult | null;
  signatures: SignatureDraftMap;
  onSigned: (role: SignatoryRole, base64Png: string) => void;
  onCleared: (role: SignatoryRole) => void;
  onPlaceChanged: (role: SignatoryRole, place: string) => void;
  onSignedByNameChanged: (role: SignatoryRole, name: string) => void;
}) {
  const sortedRoles = [...template.signatures.roles].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">{template.synthesis.title}</h2>
        <div className="overflow-hidden rounded-2xl border border-brand-outline bg-brand-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-outline text-xs font-medium uppercase tracking-wide text-brand-muted">
                <th className="px-4 py-2.5">Rubrique</th>
                <th className="px-4 py-2.5">Score</th>
                <th className="px-4 py-2.5">%</th>
                <th className="px-4 py-2.5">Mention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-outline">
              {template.synthesis.rows.map((row) => {
                const result = allSectionScores[row.sectionId];
                return (
                  <tr key={row.sectionId}>
                    <td className="px-4 py-2.5">{row.label}</td>
                    <td className="px-4 py-2.5 text-brand-muted">
                      {result ? `${result.totalScore}/${result.maxScore}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-brand-muted">{result ? `${result.percentage}%` : '—'}</td>
                    <td className="px-4 py-2.5">
                      <MentionBadge mention={result?.mention} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {overallScore && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-brand-primary/30 bg-brand-primary/5 px-5 py-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-brand-muted">
                {template.synthesis.finalMentionLabel}
              </div>
              {template.synthesis.finalMentionHelpText && (
                <div className="mt-0.5 text-xs text-brand-muted">{template.synthesis.finalMentionHelpText}</div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-brand-primary">{overallScore.percentage}%</span>
              <MentionBadge mention={overallScore.mention} />
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Signatures</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedRoles.map(({ role, label, required }) => (
            <div key={role} className="rounded-2xl border border-brand-outline bg-brand-surface p-4">
              <SignaturePad
                label={`${label}${required ? ' *' : ''}`}
                existingSignatureBase64={signatures[role]?.signatureImageBase64 ?? null}
                onSigned={(base64) => onSigned(role, base64)}
                onCleared={() => onCleared(role)}
                place={signatures[role]?.place ?? ''}
                onPlaceChanged={(value) => onPlaceChanged(role, value)}
                signedByName={signatures[role]?.signedByName ?? ''}
                onSignedByNameChanged={(value) => onSignedByNameChanged(role, value)}
              />
              <p className="mt-2 text-xs text-brand-muted">{SIGNATORY_LABELS[role]}</p>
            </div>
          ))}
        </div>
        {template.synthesis.sealLabel && (
          <p className="mt-3 text-xs text-brand-muted">{template.synthesis.sealLabel}</p>
        )}
      </section>
    </div>
  );
}
