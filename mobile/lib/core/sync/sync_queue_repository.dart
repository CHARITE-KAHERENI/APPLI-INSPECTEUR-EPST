import 'package:sqflite/sqflite.dart';

import '../db/app_database.dart';
import '../utils/local_id.dart';
import 'sync_models.dart';

/// Persistance locale (SQLite) de la file de synchronisation
/// (`sync_queue`) : une entrée par action à synchroniser (nouveau
/// formulaire, mise à jour, signature), avec son statut
/// (en_attente / en_cours / synchronisé / erreur).
///
/// [enqueue] fusionne les entrées en attente : si une entrée en_attente
/// existe déjà pour le même brouillon et la même action, elle est
/// simplement "touchée" plutôt que dupliquée — la file reste un
/// historique exploitable sans grossir indéfiniment lors d'une saisie
/// prolongée hors-ligne. `SyncEngine` relit toujours l'état *courant* du
/// brouillon au moment de la synchronisation (pas un instantané figé à
/// l'ajout en file), donc une seule entrée suffit à garantir que la
/// dernière version sera bien envoyée.
class SyncQueueRepository {
  const SyncQueueRepository();

  Future<void> enqueue(String draftId, SyncAction action) async {
    final db = await AppDatabase.instance();
    final now = DateTime.now().toIso8601String();

    final existingPending = await db.query(
      'sync_queue',
      where: 'draft_id = ? AND action = ? AND status = ?',
      whereArgs: [draftId, action.value, SyncQueueStatus.enAttente.value],
      limit: 1,
    );
    if (existingPending.isNotEmpty) {
      await db.update(
        'sync_queue',
        {'updated_at': now},
        where: 'id = ?',
        whereArgs: [existingPending.first['id']],
      );
      return;
    }

    await db.insert('sync_queue', {
      'id': generateLocalId('sync'),
      'draft_id': draftId,
      'action': action.value,
      'status': SyncQueueStatus.enAttente.value,
      'attempts': 0,
      'last_error': null,
      'created_at': now,
      'updated_at': now,
    });
  }

  /// Entrées à traiter : en attente, ou en erreur avec moins de
  /// [maxAttempts] tentatives (réessai automatique).
  Future<List<SyncQueueEntry>> listPending({int maxAttempts = 8}) async {
    final db = await AppDatabase.instance();
    final rows = await db.query(
      'sync_queue',
      where: 'status = ? OR (status = ? AND attempts < ?)',
      whereArgs: [SyncQueueStatus.enAttente.value, SyncQueueStatus.erreur.value, maxAttempts],
      orderBy: 'created_at ASC',
    );
    return rows.map(_fromRow).toList();
  }

  Future<int> countPending() async {
    final db = await AppDatabase.instance();
    final result = await db.rawQuery(
      'SELECT COUNT(*) AS n FROM sync_queue WHERE status IN (?, ?)',
      [SyncQueueStatus.enAttente.value, SyncQueueStatus.erreur.value],
    );
    return Sqflite.firstIntValue(result) ?? 0;
  }

  Future<List<SyncQueueEntry>> forDraft(String draftId) async {
    final db = await AppDatabase.instance();
    final rows = await db.query('sync_queue', where: 'draft_id = ?', whereArgs: [draftId], orderBy: 'created_at ASC');
    return rows.map(_fromRow).toList();
  }

  Future<void> markInProgress(String id) => _setStatus(id, SyncQueueStatus.enCours);

  Future<void> markSynced(String id) => _setStatus(id, SyncQueueStatus.synchronise);

  Future<void> markError(String id, String message) async {
    final db = await AppDatabase.instance();
    await db.rawUpdate(
      'UPDATE sync_queue SET status = ?, attempts = attempts + 1, last_error = ?, updated_at = ? WHERE id = ?',
      [SyncQueueStatus.erreur.value, message, DateTime.now().toIso8601String(), id],
    );
  }

  Future<void> _setStatus(String id, SyncQueueStatus status) async {
    final db = await AppDatabase.instance();
    await db.update(
      'sync_queue',
      {'status': status.value, 'updated_at': DateTime.now().toIso8601String()},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  SyncQueueEntry _fromRow(Map<String, Object?> row) {
    return SyncQueueEntry(
      id: row['id']! as String,
      draftId: row['draft_id']! as String,
      action: SyncAction.fromValue(row['action']! as String),
      status: SyncQueueStatus.fromValue(row['status']! as String),
      attempts: row['attempts']! as int,
      lastError: row['last_error'] as String?,
      createdAt: DateTime.parse(row['created_at']! as String),
      updatedAt: DateTime.parse(row['updated_at']! as String),
    );
  }
}
