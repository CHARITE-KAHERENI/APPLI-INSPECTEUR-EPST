/// Type d'action à synchroniser — voir `SyncQueueRepository.enqueue`.
enum SyncAction {
  nouveauFormulaire('nouveau_formulaire'),
  miseAJour('mise_a_jour'),
  signature('signature');

  const SyncAction(this.value);

  final String value;

  static SyncAction fromValue(String value) {
    return SyncAction.values.firstWhere((v) => v.value == value);
  }
}

/// Statut d'une entrée de la file de synchronisation.
enum SyncQueueStatus {
  enAttente('en_attente'),
  enCours('en_cours'),
  synchronise('synchronisé'),
  erreur('erreur');

  const SyncQueueStatus(this.value);

  final String value;

  static SyncQueueStatus fromValue(String value) {
    return SyncQueueStatus.values.firstWhere((v) => v.value == value);
  }
}

/// Une entrée de la file de synchronisation (`sync_queue`) : une action à
/// synchroniser pour un brouillon donné (nouveau formulaire, mise à jour,
/// signature), avec son statut et son historique de tentatives.
class SyncQueueEntry {
  const SyncQueueEntry({
    required this.id,
    required this.draftId,
    required this.action,
    required this.status,
    required this.attempts,
    required this.createdAt,
    required this.updatedAt,
    this.lastError,
  });

  final String id;
  final String draftId;
  final SyncAction action;
  final SyncQueueStatus status;
  final int attempts;
  final String? lastError;
  final DateTime createdAt;
  final DateTime updatedAt;
}
