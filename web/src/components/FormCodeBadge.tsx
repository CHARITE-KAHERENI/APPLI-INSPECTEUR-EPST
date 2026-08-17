export function FormCodeBadge({ formCode }: { formCode: string }) {
  return (
    <span className="inline-block whitespace-nowrap rounded-md border border-brand-outline bg-white px-2 py-0.5 text-xs font-semibold text-brand-primary">
      {formCode}
    </span>
  );
}
