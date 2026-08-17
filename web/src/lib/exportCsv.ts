/**
 * Export "Excel" côté client : un CSV avec séparateur `;` (convention
 * Excel en locale française — la virgule y est le séparateur décimal) et
 * un BOM UTF-8 (pour que les caractères accentués s'affichent
 * correctement à l'ouverture directe dans Excel). Choisi plutôt qu'une
 * dépendance `.xlsx` : les bibliothèques client disponibles sur npm au
 * moment de l'écriture (ex: `xlsx`/SheetJS) portent des vulnérabilités
 * connues sans correctif publié sur le registre npm.
 */
export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | null>>): void {
  const escapeCell = (value: string | number | null): string => {
    const text = value === null || value === undefined ? '' : String(value);
    if (/[",;\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const lines = [headers.map(escapeCell).join(';'), ...rows.map((row) => row.map(escapeCell).join(';'))];
  const BOM = '﻿';
  const csvContent = BOM + lines.join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
