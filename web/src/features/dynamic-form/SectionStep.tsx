import type { CriterionScore, FormSectionTemplate, SectionScoreResult } from '@c3-digital/shared';
import { MAX_CRITERION_SCORE, MIN_CRITERION_SCORE } from '@c3-digital/shared';
import { MentionBadge } from '../../components/MentionBadge';
import type { SectionDraft } from './types';

const SCORE_OPTIONS: CriterionScore[] = Array.from(
  { length: MAX_CRITERION_SCORE - MIN_CRITERION_SCORE + 1 },
  (_, index) => (MIN_CRITERION_SCORE + index) as CriterionScore,
);

export function SectionStep({
  section,
  draft,
  score,
  onScoreChange,
  onCommentChange,
  onAdviceChange,
}: {
  section: FormSectionTemplate;
  draft: SectionDraft | undefined;
  score: SectionScoreResult | null;
  onScoreChange: (criterionId: string, score: CriterionScore) => void;
  onCommentChange: (criterionId: string, comment: string) => void;
  onAdviceChange: (advice: string) => void;
}) {
  const sortedCriteria = [...section.criteria].sort((a, b) => a.order - b.order);

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            {section.code}. {section.title}
          </h2>
          {section.description && <p className="mt-1 text-sm text-brand-muted">{section.description}</p>}
        </div>
        {score && (
          <div className="flex items-center gap-2 rounded-lg border border-brand-outline bg-brand-surface px-3 py-1.5 text-sm">
            <span className="font-semibold text-slate-700">
              {score.totalScore}/{score.maxScore}
            </span>
            <MentionBadge mention={score.mention} />
          </div>
        )}
      </header>

      <div className="space-y-3">
        {sortedCriteria.map((criterion) => {
          const criterionDraft = draft?.criteria[criterion.id];
          return (
            <div key={criterion.id} className="rounded-xl border border-brand-outline bg-brand-surface p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <span className="text-sm font-medium text-slate-800">
                    {criterion.code && <span className="mr-1.5 text-brand-muted">{criterion.code}</span>}
                    {criterion.label}
                  </span>
                  {criterion.description && (
                    <p className="mt-0.5 text-xs text-brand-muted">{criterion.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  {SCORE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onScoreChange(criterion.id, option)}
                      className={`h-8 w-8 rounded-md text-sm font-semibold transition ${
                        criterionDraft?.score === option
                          ? 'bg-brand-primary text-white'
                          : 'border border-brand-outline text-slate-600 hover:bg-brand-bg'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <input
                value={criterionDraft?.comment ?? ''}
                onChange={(event) => onCommentChange(criterion.id, event.target.value)}
                placeholder={section.observationsLabel}
                className="w-full rounded-lg border border-brand-outline px-2.5 py-1.5 text-xs focus:border-brand-accent focus:outline-none"
              />
            </div>
          );
        })}
      </div>

      {section.adviceZone.enabled && (
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            {section.adviceZone.label}
            {section.adviceZone.required && <span className="ml-0.5 text-brand-danger">*</span>}
          </span>
          <textarea
            required={section.adviceZone.required}
            value={draft?.advice ?? ''}
            onChange={(event) => onAdviceChange(event.target.value)}
            placeholder={section.adviceZone.placeholder}
            rows={3}
            className="w-full rounded-lg border border-brand-outline px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
          />
        </label>
      )}
    </div>
  );
}
