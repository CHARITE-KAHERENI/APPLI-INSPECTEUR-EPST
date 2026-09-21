import type { FormHeaderValues } from '@c3-digital/shared';

/** Lit un champ d'en-tête texte libre (voir `FormHeaderValues`), `null` si absent/vide. */
export function headerText(header: FormHeaderValues, key: string): string | null {
  const value = header[key];
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return String(value);
}
