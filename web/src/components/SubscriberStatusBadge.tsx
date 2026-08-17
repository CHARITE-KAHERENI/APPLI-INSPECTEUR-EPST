import type { SubscriberStatus } from '@c3-digital/shared';

/** États du cycle de vie d'un compte facturable — voir `shared/src/types/subscription.ts`. */
const STATUS_STYLES: Record<SubscriberStatus, string> = {
  essai: 'bg-brand-accent/10 text-brand-accent',
  actif: 'bg-brand-positive/10 text-brand-positive',
  lecture_seule: 'bg-brand-warning/10 text-brand-warning',
  expire: 'bg-brand-danger/10 text-brand-danger',
};

const STATUS_LABELS: Record<SubscriberStatus, string> = {
  essai: 'Essai gratuit',
  actif: 'Actif',
  lecture_seule: 'Lecture seule',
  expire: 'Expiré',
};

export function SubscriberStatusBadge({ status }: { status: SubscriberStatus }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
