/** Franc congolais (FC) — séparateur de milliers style FR, pas de décimales (les prix du module d'abonnement sont des entiers). */
export function formatFc(amount: number | string): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)} FC`;
}
