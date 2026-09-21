import { Link, useParams } from 'react-router-dom';
import { InspectionHistoryList } from '../components/InspectionHistoryList';
import { ErrorState, LoadingState } from '../components/StatusStates';
import { useInspecteur } from '../hooks/useApi';

export function InspecteurDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: inspecteur, isLoading, isError } = useInspecteur(id);

  if (isLoading) return <LoadingState label="Chargement de la fiche inspecteur…" />;
  if (isError || !inspecteur) return <ErrorState message="Inspecteur introuvable." />;

  return (
    <div>
      <Link to="/inspecteurs" className="mb-4 inline-block text-sm text-brand-accent hover:underline">
        ← Inspecteurs
      </Link>

      <header className="mb-6 rounded-2xl border border-brand-outline bg-brand-surface p-6">
        <h1 className="text-2xl font-bold text-slate-900">{inspecteur.nom}</h1>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field label="Poste d'attache" value={inspecteur.posteAttache} />
          <Field label="Zone IGE" value={inspecteur.zone} />
          <Field label="Sexe" value={inspecteur.sexe} />
        </dl>
      </header>

      <section className="rounded-2xl border border-brand-outline bg-brand-surface p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Historique des inspections</h2>
        <InspectionHistoryList filters={{ inspecteurId: inspecteur.id }} />
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-brand-muted">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value ?? '—'}</dd>
    </div>
  );
}
