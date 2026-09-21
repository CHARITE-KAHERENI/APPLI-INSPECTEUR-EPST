import { api } from './api';

async function fetchPdfBlob(submissionId: string): Promise<Blob> {
  const response = await api.get<Blob>(`/form-submissions/${submissionId}/pdf`, { responseType: 'blob' });
  return response.data;
}

/** Ouvre le PDF généré dans un nouvel onglet ("Voir"). */
export async function openSubmissionPdf(submissionId: string): Promise<void> {
  const blob = await fetchPdfBlob(submissionId);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  // L'onglet ouvert doit avoir le temps de charger le blob avant révocation.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Télécharge le PDF généré sous `filename` ("Exporter PDF"). */
export async function downloadSubmissionPdf(submissionId: string, filename: string): Promise<void> {
  const blob = await fetchPdfBlob(submissionId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
