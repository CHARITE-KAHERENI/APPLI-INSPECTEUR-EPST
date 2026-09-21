export function LoadingState({ label = 'Chargement…' }: { label?: string }) {
  return <div className="py-16 text-center text-sm text-brand-muted">{label}</div>;
}

export function ErrorState({ message = "Une erreur est survenue lors du chargement." }: { message?: string }) {
  return (
    <div className="rounded-xl border border-brand-danger/30 bg-brand-danger/5 px-4 py-3 text-sm text-brand-danger">
      {message}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed border-brand-outline py-12 text-center text-sm text-brand-muted">{message}</div>;
}
