/**
 * Référentiels "annuaire" partagés entre le backend et le web :
 * établissements, enseignants, inspecteurs — voir `backend/src/modules/{
 * etablissements,enseignants,inspecteurs}`.
 *
 * Miroir (en plus riche, avec horodatages) du modèle déjà utilisé
 * hors-ligne côté mobile — voir `mobile/lib/core/db/reference_data.dart`.
 */

export interface Etablissement {
  id: string;
  nom: string;
  code?: string | null;
  province?: string | null;
  sousDivision?: string | null;
  milieu?: string | null;
  /** Zone d'inspection IGE (ex: "Nord-Kivu 2") — voir `AuthUser.zone`. */
  zone?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Enseignant {
  id: string;
  nom: string;
  sexe?: string | null;
  matiere?: string | null;
  etablissementId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Inspecteur {
  id: string;
  nom: string;
  sexe?: string | null;
  posteAttache?: string | null;
  /** Zone d'inspection IGE (ex: "Nord-Kivu 2"). */
  zone?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
