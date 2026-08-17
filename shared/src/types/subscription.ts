/**
 * Modèle d'essai gratuit et d'abonnement, partagé entre le backend
 * (NestJS), le web (React, page "Abonnements" IGE) et le mobile (écran de
 * sélection de formule) — voir `backend/src/modules/subscriptions`.
 */

/** Type de compte facturable — un établissement ou un inspecteur, jamais les deux à la fois. */
export const SUBSCRIBER_ACCOUNT_TYPES = ['etablissement', 'inspecteur'] as const;
export type SubscriberAccountType = (typeof SUBSCRIBER_ACCOUNT_TYPES)[number];

/**
 * Cycle de vie d'un compte facturable :
 * - `essai`         : période d'essai de 14 jours, accès complet
 * - `actif`         : abonnement (mensuel/annuel) ou pack à l'usage en cours de validité
 * - `lecture_seule` : essai/abonnement/pack expiré sans renouvellement — consultation de
 *                     l'historique possible, création de nouvelles inspections bloquée
 * - `expire`        : compte résilié (historique conservé, non utilisé automatiquement pour
 *                     l'instant — réservé à une résiliation manuelle future)
 */
export const SUBSCRIBER_STATUSES = ['essai', 'actif', 'lecture_seule', 'expire'] as const;
export type SubscriberStatus = (typeof SUBSCRIBER_STATUSES)[number];

/** `abonnement` se renouvelle par période (mensuel/annuel) ; `pack` consomme un nombre fixe d'inspections. */
export const SUBSCRIPTION_PLAN_KINDS = ['abonnement', 'pack'] as const;
export type SubscriptionPlanKind = (typeof SUBSCRIPTION_PLAN_KINDS)[number];

export const BILLING_PERIODS = ['mensuel', 'annuel'] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

/** Passerelles de paiement génériques — voir `PaymentGatewayService` (mock, à connecter aux comptes marchands réels). */
export const PAYMENT_METHODS = ['mpesa', 'orange_money', 'airtel_money', 'carte_bancaire'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['en_attente', 'reussi', 'echoue', 'rembourse'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SUBSCRIPTION_NOTIFICATION_TYPES = [
  'essai_bientot_termine',
  'essai_termine',
  'abonnement_bientot_termine',
  'abonnement_termine',
  'pack_bientot_epuise',
  'pack_termine',
  'paiement_reussi',
  'paiement_echoue',
] as const;
export type SubscriptionNotificationType = (typeof SUBSCRIPTION_NOTIFICATION_TYPES)[number];

/** Une des 3 formules payantes (le pack existe en 3 tailles : 10/20/50, donc 5 lignes en base). */
export interface SubscriptionPlan {
  id: string;
  code: string;
  label: string;
  kind: SubscriptionPlanKind;
  priceFc: number;
  billingPeriod: BillingPeriod | null;
  packInspections: number | null;
  packValidityDays: number | null;
  autoRenewDefault: boolean;
  isActive: boolean;
}

export interface Subscriber {
  id: string;
  accountType: SubscriberAccountType;
  etablissementId: string | null;
  inspecteurId: string | null;
  status: SubscriberStatus;
  trialEndsAt: string;
  currentPlanId: string | null;
  currentPlan?: SubscriptionPlan | null;
  currentPeriodEndsAt: string | null;
  autoRenew: boolean;
  packInspectionsRemaining: number | null;
  packExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  subscriberId: string;
  planId: string;
  plan?: SubscriptionPlan | null;
  amountFc: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  provider: string | null;
  providerReference: string | null;
  initiatedAt: string;
  confirmedAt: string | null;
}

export interface SubscriptionNotification {
  id: string;
  subscriberId: string;
  type: SubscriptionNotificationType;
  message: string;
  sentAt: string;
  readAt: string | null;
}

export interface CheckoutRequest {
  planCode: string;
  paymentMethod: PaymentMethod;
}

export interface CheckoutResponse {
  payment: Payment;
  /** Instructions/URL renvoyées par la passerelle pour finaliser le paiement côté client (mock pour l'instant). */
  redirectInstructions: string;
}

/** Vue d'ensemble IGE (page "Abonnements") — voir `GET /subscriptions/admin/overview`. */
export interface SubscriptionAdminOverview {
  trialCount: number;
  activeCount: number;
  readOnlyCount: number;
  totalRevenueFc: number;
  revenueByPlan: Array<{ planCode: string; planLabel: string; totalFc: number; paymentsCount: number }>;
}
