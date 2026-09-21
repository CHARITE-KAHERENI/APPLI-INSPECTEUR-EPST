import type {
  AiTrendAnalysis,
  ChatRequest,
  ChatResponse,
  Enseignant,
  Etablissement,
  Inspecteur,
  Payment,
  Subscriber,
  SubscriptionAdminOverview,
  SubscriptionNotification,
  SubscriptionPlan,
  WritingAssistantRequest,
  WritingAssistantResponse,
} from '@c3-digital/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

// --- Abonnements (page IGE — voir PROMPT 7) --------------------------------

export function useSubscriptionAdminOverview() {
  return useQuery({
    queryKey: ['subscriptions', 'admin', 'overview'],
    queryFn: async () => {
      const { data } = await api.get<SubscriptionAdminOverview>('/subscriptions/admin/overview');
      return data;
    },
  });
}

export function useSubscriptionAdminSubscribers(status?: string) {
  return useQuery({
    queryKey: ['subscriptions', 'admin', 'subscribers', status ?? ''],
    queryFn: async () => {
      const { data } = await api.get<Subscriber[]>('/subscriptions/admin/subscribers', {
        params: status ? { status } : undefined,
      });
      return data;
    },
  });
}

export function useSubscriptionAdminPayments() {
  return useQuery({
    queryKey: ['subscriptions', 'admin', 'payments'],
    queryFn: async () => {
      const { data } = await api.get<Payment[]>('/subscriptions/admin/payments');
      return data;
    },
  });
}

export function useSubscriptionAdminNotifications() {
  return useQuery({
    queryKey: ['subscriptions', 'admin', 'notifications'],
    queryFn: async () => {
      const { data } = await api.get<SubscriptionNotification[]>('/subscriptions/admin/notifications');
      return data;
    },
  });
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscriptions', 'plans'],
    queryFn: async () => {
      const { data } = await api.get<SubscriptionPlan[]>('/subscriptions/plans');
      return data;
    },
  });
}

export function useMySubscriber() {
  return useQuery({
    queryKey: ['subscriptions', 'me'],
    queryFn: async () => {
      const { data } = await api.get<Subscriber | null>('/subscriptions/me');
      return data;
    },
  });
}

// --- Intelligence artificielle (PROMPT 8) -----------------------------------

/** Assistant de rédaction — voir `pages/AssistantIaPage.tsx`. */
export function useWritingAssistant() {
  return useMutation({
    mutationFn: async (payload: WritingAssistantRequest) => {
      const { data } = await api.post<WritingAssistantResponse>('/ai/writing-assistant', payload);
      return data;
    },
  });
}

export function useLatestTrendAnalysis() {
  return useQuery({
    queryKey: ['ai', 'trend-analyses', 'latest'],
    queryFn: async () => {
      const { data } = await api.get<AiTrendAnalysis | null>('/ai/trend-analyses/latest');
      return data;
    },
  });
}

/** Réservé à `super_admin` — voir `AiController.generateTrendAnalysis`. */
export function useGenerateTrendAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<AiTrendAnalysis>('/ai/trend-analyses/generate');
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai', 'trend-analyses'] });
    },
  });
}

/** Chatbot d'assistance — voir `components/ChatbotWidget.tsx`. */
export function useChat() {
  return useMutation({
    mutationFn: async (payload: ChatRequest) => {
      const { data } = await api.post<ChatResponse>('/ai/chat', payload);
      return data;
    },
  });
}

