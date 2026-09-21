import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusStates';
import { useEtablissements } from '../hooks/useApi';

export function EtablissementsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading, isError } = useEtablissements(search || undefined);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Établissements</h1>
        <p className="mt-1 text-sm text-brand-muted">Annuaire des établissements scolaires inspectés.</p>
      </header>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Rechercher un établissement…"
        className="mb-6 w-full max-w-sm rounded-lg border border-brand-outline bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
      />

      {isLoading && <LoadingState label="Chargement des établissements…" />}
      {isError && <ErrorState message="Impossible de charger les établissements." />}
      {data && data.length === 0 && <EmptyState message="Aucun établissement trouvé." />}

      {data && data.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((etablissement) => (
            <Link
              key={etablissement.id}
              to={`/etablissements/${etablissement.id}`}
              className="rounded-2xl border border-brand-outline bg-brand-surface p-5 transition hover:border-brand-accent hover:shadow-sm"
            >
              <div className="font-semibold text-slate-800">{etablissement.nom}</div>
              <div className="mt-1 text-xs text-brand-muted">
                {[etablissement.sousDivision, etablissement.province].filter(Boolean).join(' · ') || '—'}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                {etablissement.milieu && (
                  <span className="rounded-full bg-brand-bg px-2 py-0.5 text-brand-muted">{etablissement.milieu}</span>
                )}
                {etablissement.zone && (
                  <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 font-medium text-brand-primary">
                    {etablissement.zone}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
