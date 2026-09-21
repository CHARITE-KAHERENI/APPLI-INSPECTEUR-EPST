import type { FormHeaderField, FormHeaderValues, FormTemplate } from '@c3-digital/shared';

const INPUT_CLASS =
  'w-full rounded-lg border border-brand-outline px-3 py-2 text-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/30';

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormHeaderField;
  value: string | number | null;
  onChange: (value: string | number | null) => void;
}) {
  const stringValue = value === null || value === undefined ? '' : String(value);

  if (field.type === 'textarea') {
    return (
      <textarea
        required={field.required}
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className={INPUT_CLASS}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <select
        required={field.required}
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT_CLASS}
      >
        <option value="">—</option>
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
      required={field.required}
      value={stringValue}
      onChange={(event) => onChange(field.type === 'number' ? event.target.valueAsNumber || null : event.target.value)}
      className={INPUT_CLASS}
    />
  );
}

function FieldCard({
  title,
  description,
  fields,
  header,
  onChange,
}: {
  title: string;
  description?: string;
  fields: FormHeaderField[];
  header: FormHeaderValues;
  onChange: (key: string, value: string | number | null) => void;
}) {
  const sorted = [...fields].sort((a, b) => a.order - b.order);
  return (
    <div className="rounded-2xl border border-brand-outline bg-brand-surface p-5">
      <h3 className="mb-1 font-semibold text-slate-800">{title}</h3>
      {description && <p className="mb-3 text-sm text-brand-muted">{description}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sorted.map((field) => (
          <label key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : undefined}>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {field.code && <span className="mr-1 text-brand-muted">{field.code}.</span>}
              {field.label}
              {field.required && <span className="ml-0.5 text-brand-danger">*</span>}
            </span>
            <FieldInput field={field} value={header[field.key] ?? null} onChange={(value) => onChange(field.key, value)} />
            {field.helpText && <span className="mt-1 block text-xs text-brand-muted">{field.helpText}</span>}
          </label>
        ))}
      </div>
    </div>
  );
}

export function IdentificationStep({
  template,
  header,
  onChange,
}: {
  template: FormTemplate;
  header: FormHeaderValues;
  onChange: (key: string, value: string | number | null) => void;
}) {
  const sortedHeaderFields = [...template.header.fields].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-5">
      <FieldCard title="Informations générales" fields={sortedHeaderFields} header={header} onChange={onChange} />
      {template.fieldGroups.map((group) => (
        <FieldCard
          key={group.id}
          title={group.code ? `${group.code}. ${group.title}` : group.title}
          description={group.description}
          fields={group.fields}
          header={header}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
