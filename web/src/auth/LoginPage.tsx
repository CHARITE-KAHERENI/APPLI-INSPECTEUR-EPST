import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

const DEMO_ACCOUNTS = [
  { email: 'super.admin@exemple.cd', role: 'super_admin' },
  { email: 'ige.nordkivu2@exemple.cd', role: 'ige_admin — zone Nord-Kivu 2' },
  { email: 'chef.institutdelapaix@exemple.cd', role: 'chef_etablissement' },
  { email: 'inspecteur.tshisekedi@exemple.cd', role: 'inspecteur' },
  { email: 'enseignant.mukendi@exemple.cd', role: 'enseignant' },
];

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {
      setError('Adresse e-mail ou mot de passe incorrect.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary text-xl font-bold text-white">
            IGE
          </div>
          <h1 className="text-2xl font-bold text-brand-primary">c3-digital</h1>
          <p className="mt-1 text-sm text-brand-muted">
            Inspection Générale de l'Enseignement — RDC
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-brand-outline bg-brand-surface p-8 shadow-sm"
        >
          <h2 className="mb-6 text-lg font-semibold text-slate-800">Connexion</h2>

          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Adresse e-mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-brand-outline px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
              placeholder="prenom.nom@exemple.cd"
            />
          </label>

          <label className="mb-6 block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Mot de passe</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-brand-outline px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p className="mb-4 rounded-lg bg-brand-danger/10 px-3 py-2 text-sm text-brand-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primary/90 disabled:opacity-60"
          >
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <details className="mt-6 rounded-xl border border-brand-outline bg-brand-surface p-4 text-xs text-brand-muted">
          <summary className="cursor-pointer font-medium text-slate-600">
            Comptes de démonstration (données fictives)
          </summary>
          <ul className="mt-3 space-y-1.5">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email} className="flex justify-between gap-3">
                <span className="font-mono">{account.email}</span>
                <span>{account.role}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3">
            Mot de passe pour tous les comptes : <span className="font-mono">password123</span>
          </p>
        </details>
      </div>
    </div>
  );
}
