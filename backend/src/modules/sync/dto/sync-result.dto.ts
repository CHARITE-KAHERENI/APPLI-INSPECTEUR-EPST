/** Résultat de la synchronisation d'une entrée de la file mobile. */
export interface SyncResultDto {
  /** Identifiant local de la file de synchronisation (réémis tel quel). */
  localId: string;
  /** Identifiant du `form_submissions` correspondant côté serveur. */
  submissionId: string;
  status: 'synced' | 'error';
  /**
   * `false` si le serveur possédait déjà une version locale au moins aussi
   * récente (`clientUpdatedAt`) : la synchronisation est alors un no-op
   * idempotent, pas une erreur.
   */
  applied: boolean;
  /**
   * `true` si le serveur a détecté une modification côté serveur
   * (`baseServerUpdatedAt` fourni par l'appareil ne correspondait plus à
   * `updatedAt`) en plus de la modification locale — la version locale a
   * tout de même été appliquée, et l'ancienne version serveur a été
   * archivée dans `form_submission_versions` pour consultation par l'IGE.
   */
  conflict: boolean;
  serverUpdatedAt?: string;
  message?: string;
}

export interface SyncStatusResponseDto {
  status: 'ok';
  serverTime: string;
}
