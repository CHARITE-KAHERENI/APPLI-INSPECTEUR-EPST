import type { FormCode } from '@c3-digital/shared';
import { FormSubmissionEntity } from '../entities/form-submission.entity';

export interface FormCodeStats {
  formCode: FormCode;
  count: number;
  /** Moyenne de `overallPercentage` (0-100), `null` si aucun formulaire noté pour ce code. */
  averagePercentage: number | null;
}

/** Réponse de `GET /form-submissions/stats` — alimente le tableau de bord IGE (web). */
export interface DashboardStats {
  totalInspections: number;
  byFormCode: FormCodeStats[];
  /** Nombre d'établissements distincts ayant au moins une inspection dans le périmètre de l'utilisateur. */
  activeEtablissements: number;
  /** Les inspections les plus récentes, dans le périmètre de l'utilisateur. */
  latest: FormSubmissionEntity[];
}
