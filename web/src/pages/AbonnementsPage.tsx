import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RevenueByPlanBarList } from '../components/RevenueByPlanBarList';
import { SubscriberStatusBadge } from '../components/SubscriberStatusBadge';
import { StatCard } from '../components/StatCard';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusStates';
import { useAuth } from '../auth/useAuth';
import {
  useSubscriptionAdminNotifications,
  useSubscriptionAdminOverview,
  useSubscriptionAdminPayments,
  useSubscriptionAdminSubscribers,
} from '../hooks/useApi';
import { formatFc } from '../lib/currency';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mpesa: 'M-Pesa',
  orange_money: 'Orange Money',
  airtel_money: 'Airtel Money',
  carte_bancaire: 'Carte bancaire',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  reussi: 'Réussi',
  echoue: 'Échoué',
  rembourse: 'Remboursé',
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  en_attente: 'bg-brand-warning/10 text-brand-warning',
  reussi: 'bg-brand-positive/10 text-brand-positive',
  echoue: 'bg-brand-danger/10 text-brand-danger',
  rembourse: 'bg-slate-100 text-slate-600',
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  essai_bientot_termine: "Essai bientôt terminé",
  essai_termine: 'Essai terminé',
  abonnement_bientot_termine: 'Abonnement bientôt terminé',
  abonnement_termine: 'Abonnement terminé',
  pack_bientot_epuise: 'Pack bientôt épuisé',
  pack_termine: 'Pack épuisé/expiré',
  paiement_reussi: 'Paiement réussi',
  paiement_echoue: 'Paiement échoué',
};

/** Nom lisible d'un compte facturable (établissement ou inspecteur). */
function subscriberName(subscriber: { accountType: string; etablissement?: { nom: string } | null; inspecteur?: { nom: string } | null }) {
  if (subscriber.accountType === 'etablissement') {
    return subscriber.etablissement?.nom ?? 'Établissement';
  }
  return subscriber.inspecteur?.nom ?? 'Inspecteur';
}

/**
 * Page "Abonnements" (IGE uniquement — `ige_admin`/`super_admin`) : vue
 * d'ensemble des comptes en essai, revenus, formules actives, historique
 * des paiements et relances envoyées avant expiration (PROMPT 7, point 5).
 * Les listes sont déjà restreintes à la zone IGE de l'utilisateur côté
 * backend (voir `SubscribersService.scopedQueryBuilder`), comme le reste
 * de l'application.
 */
export function AbonnementsPage() {
  const { user } = useAuth();
  const { data: overview, isLoading: overviewLoading, isError: overviewError } = useSubscriptionAdminOverview();
  const { data: subscribers, isLoading: subscribersLoading } = useSubscriptionAdminSubscribers();
  const { data: payments, isLoading: paymentsLoading } = useSubscriptionAdminPayments();
  const { data: notifications, isLoading: notificationsLoading } = useSubscriptionAdminNotifications();

  if (user && user.role !== 'ige_admin' && user.role !== 'super_admin') {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold text-slate-900">Abonnements</h1>
        <ErrorState message="Cette page est réservée à l'IGE." />
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Abonnements</h1>
        <p className="mt-1 text-sm text-brand-muted">
          {user?.zone
            ? `Essai gratuit, formules actives et paiements — zone ${user.zone}.`
            : 'Essai gratuit, formules actives et paiements.'}
        </p>
      </header>

      {overviewLoading && <LoadingState label="Chargement de la vue d'ensemble…" />}
      {overviewError && <ErrorState message="Impossible de charger la vue d'ensemble des abonnements." />}

      {overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Comptes en essai" value={String(overview.trialCount)} />
            <StatCard label="Comptes actifs" value={String(overview.activeCount)} />
            <StatCard label="Comptes en lecture seule" value={String(overview.readOnlyCount)} />
            <StatCard label="Revenu total" value={formatFc(overview.totalRevenueFc)} />
          </div>

          <RevenueByPlanBarList data={overview.revenueByPlan} />

          <div className="rounded-2xl border border-brand-outline bg-brand-surface p-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-800">Comptes facturables</h3>
            {subscribersLoading && <LoadingState label="Chargement des comptes…" />}
            {subscribers && subscribers.length === 0 && (
              <EmptyState message="Aucun compte facturable dans ce périmètre." />
            )}
            {subscribers && subscribers.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-brand-outline text-xs font-medium uppercase tracking-wide text-brand-muted">
                      <th className="px-4 py-3">Compte</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3">Formule</th>
                      <th className="px-4 py-3">Échéance / pack</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-outline">
                    {subscribers.map((subscriber) => (
                      <tr key={subscriber.id} className="hover:bg-brand-bg/60">
                        <td className="px-4 py-3 font-medium text-slate-800">{subscriberName(subscriber)}</td>
                        <td className="px-4 py-3 text-brand-muted">
                          {subscriber.accountType === 'etablissement' ? 'Établissement' : 'Inspecteur'}
                        </td>
                        <td className="px-4 py-3">
                          <SubscriberStatusBadge status={subscriber.status} />
                        </td>
                        <td className="px-4 py-3 text-brand-muted">{subscriber.currentPlan?.label ?? '—'}</td>
                        <td className="px-4 py-3 text-brand-muted">
                          {subscriber.status === 'essai' && (
                            <>Essai jusqu'au {format(new Date(subscriber.trialEndsAt), 'd MMM yyyy', { locale: fr })}</>
                          )}
                          {subscriber.currentPeriodEndsAt && (
                            <>Jusqu'au {format(new Date(subscriber.currentPeriodEndsAt), 'd MMM yyyy', { locale: fr })}</>
                          )}
                          {subscriber.packInspectionsRemaining !== null && (
                            <>{subscriber.packInspectionsRemaining} inspection(s) restante(s)</>
                          )}
                          {subscriber.status !== 'essai' &&
                            !subscriber.currentPeriodEndsAt &&
                            subscriber.packInspectionsRemaining === null &&
                            '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-brand-outline bg-brand-surface p-6">
              <h3 className="mb-4 text-sm font-semibold text-slate-800">Historique des paiements</h3>
              {paymentsLoading && <LoadingState label="Chargement des paiements…" />}
              {payments && payments.length === 0 && <EmptyState message="Aucun paiement pour l'instant." />}
              {payments && payments.length > 0 && (
                <ul className="divide-y divide-brand-outline">
                  {payments.map((payment) => (
                    <li key={payment.id} className="flex items-center gap-3 py-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-slate-800">
                          {payment.plan?.label ?? 'Formule'} — {PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}
                        </div>
                        <div className="text-xs text-brand-muted">
                          {format(new Date(payment.initiatedAt), 'd MMM yyyy · HH:mm', { locale: fr })}
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-sm font-semibold tabular-nums text-slate-700">
                        {formatFc(payment.amountFc)}
                      </div>
                      <span
                        className={`inline-block shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          PAYMENT_STATUS_STYLES[payment.status] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-brand-outline bg-brand-surface p-6">
              <h3 className="mb-1 text-sm font-semibold text-slate-800">Relances</h3>
              <p className="mb-4 text-xs text-brand-muted">
                Notifications automatiques envoyées avant expiration de l'essai, de l'abonnement ou du pack.
              </p>
              {notificationsLoading && <LoadingState label="Chargement des relances…" />}
              {notifications && notifications.length === 0 && <EmptyState message="Aucune relance pour l'instant." />}
              {notifications && notifications.length > 0 && (
                <ul className="divide-y divide-brand-outline">
                  {notifications.map((notification) => (
                    <li key={notification.id} className="py-3 text-sm">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-brand-primary">
                          {NOTIFICATION_TYPE_LABELS[notification.type] ?? notification.type}
                        </span>
                        <span className="shrink-0 text-xs text-brand-muted">
                          {format(new Date(notification.sentAt), 'd MMM yyyy', { locale: fr })}
                        </span>
                      </div>
                      <p className="text-brand-muted">{notification.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
