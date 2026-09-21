import 'dart:async';

import 'package:flutter/foundation.dart';

import '../api/sync_api_client.dart';
import '../db/form_draft_repository.dart';
import '../models/form_template_repository.dart';
import 'connectivity_service.dart';
import 'sync_models.dart';
import 'sync_payload_builder.dart';
import 'sync_queue_repository.dart';

/// Orchestre la synchronisation hors-ligne : écoute la connectivité
/// (`connectivity_plus`), traite la file (`sync_queue`) dès qu'une
/// connexion est détectée, avec réessai automatique à intervalle croissant
/// en cas d'échec (5 s, 10 s, 20 s... jusqu'à 5 min).
///
/// Expose son état (`isOnline`, `isSyncing`, `pendingCount`, `lastSyncAt`)
/// pour que [SyncStatusBanner] puisse l'afficher sur chaque écran.
class SyncEngine extends ChangeNotifier {
  SyncEngine({
    ConnectivityService? connectivityService,
    SyncApiClient? apiClient,
    SyncQueueRepository syncQueueRepository = const SyncQueueRepository(),
    FormDraftRepository draftRepository = const FormDraftRepository(),
    FormTemplateRepository templateRepository = const FormTemplateRepository(),
  }) : _connectivityService = connectivityService ?? ConnectivityService(),
       _apiClient = apiClient ?? SyncApiClient(),
       _syncQueueRepository = syncQueueRepository,
       _draftRepository = draftRepository,
       _templateRepository = templateRepository;

  final ConnectivityService _connectivityService;
  final SyncApiClient _apiClient;
  final SyncQueueRepository _syncQueueRepository;
  final FormDraftRepository _draftRepository;
  final FormTemplateRepository _templateRepository;

  StreamSubscription<bool>? _connectivitySub;
  Timer? _retryTimer;
  Timer? _periodicTimer;
  bool _started = false;
  bool _disposed = false;

  static const _baseBackoff = Duration(seconds: 5);
  static const _maxBackoff = Duration(minutes: 5);
  Duration _currentBackoff = _baseBackoff;

  bool isOnline = false;
  bool isSyncing = false;
  int pendingCount = 0;
  DateTime? lastSyncAt;
  String? lastError;

  /// À appeler une fois au démarrage de l'application (voir `main.dart`).
  void start() {
    if (_started) return;
    _started = true;

    _connectivitySub = _connectivityService.onConnectivityChanged.listen((connected) {
      isOnline = connected;
      _safeNotify();
      if (connected) {
        unawaited(triggerSync());
      }
    });

    unawaited(_connectivityService.hasNetworkConnection().then((connected) {
      isOnline = connected;
      _safeNotify();
      if (connected) {
        unawaited(triggerSync());
      }
    }));

    // Sondage périodique de secours : couvre les cas où l'interface réseau
    // reste "connectée" sans jamais émettre de nouvel évènement (ex:
    // l'application démarre alors que le Wi-Fi est déjà actif).
    _periodicTimer = Timer.periodic(const Duration(minutes: 2), (_) => triggerSync());

    unawaited(_refreshPendingCount());
  }

  /// Déclenche une tentative de synchronisation immédiate. Sans effet si
  /// une synchronisation est déjà en cours (le prochain déclenchement — fin
  /// de la sync en cours, reconnexion, minuterie — la reprendra).
  Future<void> triggerSync() async {
    if (isSyncing) return;
    isSyncing = true;
    _safeNotify();

    try {
      final reachable = await _apiClient.checkServerReachable();
      isOnline = reachable;
      if (!reachable) {
        return;
      }

      final pending = await _syncQueueRepository.listPending();
      if (pending.isEmpty) {
        _currentBackoff = _baseBackoff;
        lastError = null;
        return;
      }

      await _syncPendingEntries(pending);
    } catch (error) {
      lastError = error.toString();
      _currentBackoff = _nextBackoff(_currentBackoff);
      _scheduleRetry();
    } finally {
      isSyncing = false;
      await _refreshPendingCount();
      _safeNotify();
    }
  }

  Future<void> _syncPendingEntries(List<SyncQueueEntry> pending) async {
    final entriesByDraft = <String, List<SyncQueueEntry>>{};
    for (final entry in pending) {
      entriesByDraft.putIfAbsent(entry.draftId, () => []).add(entry);
    }

    final payloads = <Map<String, dynamic>>[];
    for (final draftId in entriesByDraft.keys) {
      final draft = await _draftRepository.findById(draftId);
      if (draft == null) {
        // Le brouillon a disparu localement entre-temps : on ne peut plus
        // rien synchroniser pour cette entrée, inutile de la retenter.
        for (final entry in entriesByDraft[draftId]!) {
          await _syncQueueRepository.markError(entry.id, 'Brouillon local introuvable.');
        }
        continue;
      }
      final template = await _templateRepository.load(draft.formCode);
      payloads.add(buildSyncPayload(localId: draftId, draft: draft, template: template));
    }

    if (payloads.isEmpty) {
      return;
    }

    for (final draftId in payloads.map((p) => p['localId'] as String)) {
      for (final entry in entriesByDraft[draftId]!) {
        await _syncQueueRepository.markInProgress(entry.id);
      }
    }

    List<SyncSubmissionResult> results;
    try {
      results = await _apiClient.syncSubmissions(payloads);
    } catch (error) {
      // La requête a échoué globalement : toutes les entrées mises "en
      // cours" ci-dessus repassent en erreur pour être retentées.
      for (final draftId in payloads.map((p) => p['localId'] as String)) {
        for (final entry in entriesByDraft[draftId]!) {
          await _syncQueueRepository.markError(entry.id, error.toString());
        }
      }
      rethrow;
    }

    var anyError = false;
    for (final result in results) {
      final entries = entriesByDraft[result.localId] ?? const [];
      if (result.isError) {
        anyError = true;
        for (final entry in entries) {
          await _syncQueueRepository.markError(entry.id, result.message ?? 'Erreur inconnue.');
        }
        continue;
      }
      for (final entry in entries) {
        await _syncQueueRepository.markSynced(entry.id);
      }
      if (result.serverUpdatedAt != null) {
        final draft = await _draftRepository.findById(result.localId);
        if (draft != null) {
          final updated = draft.markSynced(
            serverUpdatedAt: DateTime.parse(result.serverUpdatedAt!),
            syncedAt: DateTime.now(),
          );
          await _draftRepository.save(updated);
        }
      }
    }

    lastSyncAt = DateTime.now();
    lastError = anyError ? 'Certains formulaires n\'ont pas pu être synchronisés — nouvelle tentative automatique.' : null;
    _currentBackoff = anyError ? _nextBackoff(_currentBackoff) : _baseBackoff;
    if (anyError) {
      _scheduleRetry();
    }
  }

  Duration _nextBackoff(Duration current) {
    final next = current * 2;
    return next > _maxBackoff ? _maxBackoff : next;
  }

  void _scheduleRetry() {
    _retryTimer?.cancel();
    _retryTimer = Timer(_currentBackoff, () => unawaited(triggerSync()));
  }

  Future<void> _refreshPendingCount() async {
    pendingCount = await _syncQueueRepository.countPending();
  }

  void _safeNotify() {
    if (!_disposed) {
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _connectivitySub?.cancel();
    _retryTimer?.cancel();
    _periodicTimer?.cancel();
    _apiClient.dispose();
    super.dispose();
  }
}
