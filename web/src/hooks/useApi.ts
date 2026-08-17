import type { Enseignant, Etablissement, Inspecteur } from '@c3-digital/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ApiFormSubmission, DashboardStats, FormSubmissionFilters } from '../types/api';

/** Cartes de synthèse + graphique du tableau de bord IGE. */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['form-submissions', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<DashboardStats>('/form-submissions/stats');
      return data;
    },
  });
}

/** Page "Inspections" : liste filtrée (déjà restreinte au périmètre du rôle côté backend). */
export function useFormSubmissions(filters: FormSubmissionFilters) {
  return useQuery({
    queryKey: ['form-submissions', filters],
    queryFn: async () => {
      const { data } = await api.get<ApiFormSubmission[]>('/form-submissions', { params: filters });
      return data;
    },
  });
}

export function useFormSubmission(id: string | undefined) {
  return useQuery({
    queryKey: ['form-submissions', id],
    queryFn: async () => {
      const { data } = await api.get<ApiFormSubmission>(`/form-submissions/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useEtablissements(search?: string) {
  return useQuery({
    queryKey: ['etablissements', search ?? ''],
    queryFn: async () => {
      const { data } = await api.get<Etablissement[]>('/etablissements', {
        params: search ? { search } : undefined,
      });
      return data;
    },
  });
}

export function useEtablissement(id: string | undefined) {
  return useQuery({
    queryKey: ['etablissements', id],
    queryFn: async () => {
      const { data } = await api.get<Etablissement>(`/etablissements/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useEnseignants(etablissementId?: string) {
  return useQuery({
    queryKey: ['enseignants', etablissementId ?? ''],
    queryFn: async () => {
      const { data } = await api.get<Enseignant[]>('/enseignants', {
        params: etablissementId ? { etablissementId } : undefined,
      });
      return data;
    },
  });
}

export function useInspecteurs(search?: string) {
  return useQuery({
    queryKey: ['inspecteurs', search ?? ''],
    queryFn: async () => {
      const { data } = await api.get<Inspecteur[]>('/inspecteurs', {
        params: search ? { search } : undefined,
      });
      return data;
    },
  });
}

export function useInspecteur(id: string | undefined) {
  return useQuery({
    queryKey: ['inspecteurs', id],
    queryFn: async () => {
      const { data } = await api.get<Inspecteur>(`/inspecteurs/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

