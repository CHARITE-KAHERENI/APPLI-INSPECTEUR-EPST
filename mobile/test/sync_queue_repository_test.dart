import 'package:c3_digital/core/db/app_database.dart';
import 'package:c3_digital/core/sync/sync_models.dart';
import 'package:c3_digital/core/sync/sync_queue_repository.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/sqflite_ffi_setup.dart';

/// File de synchronisation locale (PROMPT 9, point 1) — `sync_queue`
/// (SQLite) est la brique qui permet à `SyncEngine` de retenter l'envoi
/// après reconnexion : ce test couvre l'ajout, la fusion des entrées en
/// attente (pas de doublon pendant une saisie prolongée hors-ligne), et
/// les transitions de statut (en_attente -> synchronisé / erreur).
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpSqfliteFfi();

  const repository = SyncQueueRepository();

  setUp(() async {
    // Base fraîche à chaque test (voir `AppDatabase.reset`) — la file de
    // synchronisation ne doit jamais fuiter d'un test à l'autre.
    await AppDatabase.reset();
  });

  tearDownAll(() async {
    await AppDatabase.reset();
  });

  test('enqueue crée une entrée en_attente', () async {
    await repository.enqueue('draft-1', SyncAction.nouveauFormulaire);

    final pending = await repository.listPending();
    expect(pending, hasLength(1));
    expect(pending.first.draftId, 'draft-1');
    expect(pending.first.status, SyncQueueStatus.enAttente);
    expect(pending.first.attempts, 0);
  });

  test('enqueue sur la même action déjà en_attente ne duplique pas la file', () async {
    await repository.enqueue('draft-2', SyncAction.miseAJour);
    await repository.enqueue('draft-2', SyncAction.miseAJour);
    await repository.enqueue('draft-2', SyncAction.miseAJour);

    final entries = await repository.forDraft('draft-2');
    expect(entries, hasLength(1));
  });

  test('markSynced retire une entrée de la liste des entrées à traiter', () async {
    await repository.enqueue('draft-3', SyncAction.miseAJour);
    final [entry] = await repository.listPending();

    await repository.markSynced(entry.id);

    final pendingAfter = await repository.listPending();
    expect(pendingAfter, isEmpty);
    final all = await repository.forDraft('draft-3');
    expect(all.single.status, SyncQueueStatus.synchronise);
  });

  test('markError incrémente les tentatives et reste éligible au réessai sous le plafond', () async {
    await repository.enqueue('draft-4', SyncAction.miseAJour);
    final [entry] = await repository.listPending();

    await repository.markError(entry.id, 'Le serveur a répondu 500.');

    final pendingAfter = await repository.listPending();
    expect(pendingAfter, hasLength(1));
    expect(pendingAfter.first.status, SyncQueueStatus.erreur);
    expect(pendingAfter.first.attempts, 1);
    expect(pendingAfter.first.lastError, contains('500'));
  });

  test('markError au-delà du plafond de tentatives sort l\'entrée du réessai automatique', () async {
    await repository.enqueue('draft-5', SyncAction.miseAJour);
    final [entry] = await repository.listPending();

    for (var i = 0; i < 3; i++) {
      await repository.markError(entry.id, 'Échec réseau');
    }

    final stillEligible = await repository.listPending(maxAttempts: 2);
    expect(stillEligible, isEmpty);
    final stillEligibleWithHigherCap = await repository.listPending(maxAttempts: 8);
    expect(stillEligibleWithHigherCap, hasLength(1));
  });

  test('countPending compte les entrées en_attente et en_erreur (sous le plafond)', () async {
    await repository.enqueue('draft-6', SyncAction.nouveauFormulaire);
    await repository.enqueue('draft-7', SyncAction.signature);

    expect(await repository.countPending(), 2);
  });
}
