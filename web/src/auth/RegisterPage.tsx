import { useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

type AccountKind = 'etablissement' | 'inspecteur';

const INPUT_CLASS =
  'w-full rounded-lg border border-brand-outline px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30';
const LABEL_CLASS = 'mb-1 block text-sm font-medium text-slate-700';

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) return data.message.join(' ');
    if (data?.message) return data.message;
    if (error.response?.status === 409) return 'Un compte existe déjà avec cette adresse e-mail.';
  }
  return "L'inscription a échoué. Vérifiez les informations saisies et réessayez.";
}

export function RegisterPage() {
  const { user, registerEtablissement, registerInspecteur } = useAuth();
  const navigate = useNavigate();
  const [kind, setKind] = useState<AccountKind>('etablissement');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Champs communs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [zone, setZone] = useState('');

  // Établissement
  const [etablissementNom, setEtablissementNom] = useState('');
  const [chefNomComplet, setChefNomComplet] = useState('');
  const [province, setProvince] = useState('');
  const [sousDivision, setSousDivision] = useState('');
  const [milieu, setMilieu] = useState('');

  // Inspecteur
  const [nom, setNom] = useState('');
  const [posteAttache, setPosteAttache] = useState('');

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (kind === 'etablissement') {
        await registerEtablissement({
          etablissementNom,
          chefNomComplet,
          email,
          password,
          province: province || undefined,
          sousDivision: sousDivision || undefined,
          milieu: milieu || undefined,
          zone: zone || undefined,
        });
      } else {
        await registerInspecteur({
          nom,
          email,
          password,
          posteAttache: posteAttache || undefined,
          zone: zone || undefined,
        });
      }
      navigate('/', { replace: true });
    } catch (submitError) {
      setError(extractErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary text-xl font-bold text-white">
            IGE
          </div>
          <h1 className="text-2xl font-bold text-brand-primary">c3-digital</h1>
          <p className="mt-1 text-sm text-brand-muted">Créer un compte — essai gratuit de 14 jours</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-brand-outline bg-brand-surface p-8 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Inscription</h2>

          <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-brand-bg p-1">
            <button
              type="button"
              onClick={() => setKind('etablissement')}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                kind === 'etablissement' ? 'bg-brand-primary text-white' : 'text-slate-600 hover:bg-white'
              }`}
            >
              Chef d'établissement
            </button>
            <button
              type="button"
              onClick={() => setKind('inspecteur')}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                kind === 'inspecteur' ? 'bg-brand-primary text-white' : 'text-slate-600 hover:bg-white'
              }`}
            >
              Inspecteur
            </button>
          </div>

          {kind === 'etablissement' ? (
            <>
              <label className="mb-4 block">
                <span className={LABEL_CLASS}>Nom de l'établissement</span>
                <input
                  required
                  value={etablissementNom}
                  onChange={(event) => setEtablissementNom(event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Institut de la Paix"
                />
              </label>

              <label className="mb-4 block">
                <span className={LABEL_CLASS}>Nom complet du chef d'établissement</span>
                <input
                  required
                  value={chefNomComplet}
                  onChange={(event) => setChefNomComplet(event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Jean Mukendi"
                />
              </label>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={LABEL_CLASS}>Province</span>
                  <input
                    value={province}
                    onChange={(event) => setProvince(event.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Nord-Kivu"
                  />
                </label>
                <label className="block">
                  <span className={LABEL_CLASS}>Sous-division</span>
                  <input
                    value={sousDivision}
                    onChange={(event) => setSousDivision(event.target.value)}
                    className={INPUT_CLASS}
                  />
                </label>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={LABEL_CLASS}>Milieu</span>
                  <input
                    value={milieu}
                    onChange={(event) => setMilieu(event.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Urbain"
                  />
                </label>
                <label className="block">
                  <span className={LABEL_CLASS}>Zone d'inspection</span>
                  <input
                    value={zone}
                    onChange={(event) => setZone(event.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Nord-Kivu 2"
                  />
                </label>
              </div>
            </>
          ) : (
            <>
              <label className="mb-4 block">
                <span className={LABEL_CLASS}>Nom complet</span>
                <input
                  required
                  value={nom}
                  onChange={(event) => setNom(event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Marie Tshisekedi"
                />
              </label>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={LABEL_CLASS}>Poste d'attache</span>
                  <input
                    value={posteAttache}
                    onChange={(event) => setPosteAttache(event.target.value)}
                    className={INPUT_CLASS}
                  />
                </label>
                <label className="block">
                  <span className={LABEL_CLASS}>Zone d'inspection</span>
                  <input
                    value={zone}
                    onChange={(event) => setZone(event.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Nord-Kivu 2"
                  />
                </label>
              </div>
            </>
          )}

          <label className="mb-4 block">
            <span className={LABEL_CLASS}>Adresse e-mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={INPUT_CLASS}
              placeholder="prenom.nom@exemple.cd"
            />
          </label>

          <label className="mb-6 block">
            <span className={LABEL_CLASS}>Mot de passe</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={INPUT_CLASS}
              placeholder="8 caractères minimum"
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
            {isSubmitting ? 'Création du compte…' : 'Créer mon compte'}
          </button>

          <p className="mt-4 text-center text-sm text-brand-muted">
            Déjà un compte ?{' '}
            <Link to="/connexion" className="font-medium text-brand-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
