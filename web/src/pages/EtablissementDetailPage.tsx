import { Link, useParams } from 'react-router-dom';
import { InspectionHistoryList } from '../components/InspectionHistoryList';
import { ErrorState, LoadingState } from '../components/StatusStates';
import { useEnseignants, useEtablissement } from '../hooks/useApi';

export function EtablissementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: etablissement, isLoading, isError } = useEtablissement(id);
  const { data: enseignants } = useEnseignants(id);

  if (isLoading) return <LoadingState label="Chargement de la fiche établissement…" />;
  if (isError || !etablissement) return <ErrorState message="Établissement introuvable." />;

  return (
    <div>
      <Link to="/etablissements" className="mb-4 inline-block text-sm text-brand-accent hover:underline">
        ← Établissements
      </Link>

      <header className="mb-6 rounded-2xl border border-brand-outline bg-brand-surface p-6">
        <h1 className="text-2xl font-bold text-slate-900">{etablissement.nom}</h1>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Field label="Code" value={etablissement.code} />
          <Field label="Province" value={etablissement.province} />
          <Field label="Sous-division" value={etablissement.sousDivision} />
          <Field label="Milieu" value={etablissement.milieu} />
          <Field label="Zone IGE" value={etablissement.zone} />
        </dl>
      </header>

      <section className="mb-6 rounded-2xl border border-brand-outline bg-brand-surface p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Enseignants ({enseignants?.length ?? 0})</h2>
        {enseignants && enseignants.length > 0 ? (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {enseignants.map((enseignant) => (
              <li key={enseignant.id} className="rounded-lg bg-brand-bg px-3 py-2 text-sm">
                <div className="font-medium text-slate-800">{enseignant.nom}</div>
                <div className="text-xs text-brand-muted">{enseignant.matiere ?? '—'}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-brand-muted">Aucun enseignant enregistré pour cet établissement.</p>
        )}
      </section>

      <section className="rounded-2xl border border-brand-outline bg-brand-surface p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Historique des inspections</h2>
        <InspectionHistoryList filters={{ etablissementId: etablissement.id }} />
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
