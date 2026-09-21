import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusStates';
import { useInspecteurs } from '../hooks/useApi';

export function InspecteursPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading, isError } = useInspecteurs(search || undefined);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Inspecteurs</h1>
        <p className="mt-1 text-sm text-brand-muted">Annuaire des inspecteurs de l'IGE.</p>
      </header>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Rechercher un inspecteur…"
        className="mb-6 w-full max-w-sm rounded-lg border border-brand-outline bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
      />

      {isLoading && <LoadingState label="Chargement des inspecteurs…" />}
      {isError && <ErrorState message="Impossible de charger les inspecteurs." />}
      {data && data.length === 0 && <EmptyState message="Aucun inspecteur trouvé." />}

      {data && data.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((inspecteur) => (
            <Link
              key={inspecteur.id}
              to={`/inspecteurs/${inspecteur.id}`}
              className="rounded-2xl border border-brand-outline bg-brand-surface p-5 transition hover:border-brand-accent hover:shadow-sm"
            >
              <div className="font-semibold text-slate-800">{inspecteur.nom}</div>
              <div className="mt-1 text-xs text-brand-muted">{inspecteur.posteAttache ?? '—'}</div>
              {inspecteur.zone && (
                <div className="mt-3">
                  <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[11px] font-medium text-brand-primary">
                    {inspecteur.zone}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
