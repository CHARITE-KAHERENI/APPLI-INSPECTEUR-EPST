import 'package:flutter/material.dart';

import '../../core/api/sync_api_client.dart';
import '../../core/theme/app_colors.dart';

/// Écran "Historique" d'un formulaire : consulte, via `GET
/// /sync/submissions/:id/history`, la version actuellement stockée côté
/// serveur ainsi que les versions qu'elle a remplacées lors des
/// synchronisations précédentes.
///
/// Répond à l'exigence de gestion des conflits ("conserve un historique
/// des deux versions consultable par l'IGE") : quand une synchronisation
/// détecte qu'une modification serveur indépendante a eu lieu entre-temps,
/// l'ancienne version reste ici consultable plutôt que d'être perdue.
class SubmissionHistoryScreen extends StatefulWidget {
  const SubmissionHistoryScreen({super.key, required this.submissionId, required this.title});

  final String submissionId;
  final String title;

  @override
  State<SubmissionHistoryScreen> createState() => _SubmissionHistoryScreenState();
}

class _SubmissionHistoryScreenState extends State<SubmissionHistoryScreen> {
  final _apiClient = SyncApiClient();
  late Future<SubmissionHistory> _future;

  @override
  void initState() {
    super.initState();
    _future = _apiClient.fetchSubmissionHistory(widget.submissionId);
  }

  @override
  void dispose() {
    _apiClient.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    setState(() {
      _future = _apiClient.fetchSubmissionHistory(widget.submissionId);
    });
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Historique — ${widget.title}')),
      body: FutureBuilder<SubmissionHistory>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _ErrorState(error: snapshot.error, onRetry: _reload);
          }

          final history = snapshot.data!;
          if (history.current == null && history.versions.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Ce formulaire n\'a pas encore été synchronisé avec le serveur : '
                  'aucun historique disponible pour l\'instant.',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: _reload,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (history.current != null) ...[
                  Text('Version actuelle (serveur)', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  _CurrentVersionCard(current: history.current!),
                  const SizedBox(height: 20),
                ],
                Text('Versions remplacées', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                if (history.versions.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text(
                      'Aucune version antérieure — ce formulaire n\'a été synchronisé qu\'une seule fois.',
                      style: TextStyle(color: AppColors.textMuted),
                    ),
                  )
                else
                  for (final version in history.versions) _VersionCard(version: version),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _CurrentVersionCard extends StatelessWidget {
  const _CurrentVersionCard({required this.current});

  final Map<String, dynamic> current;

  @override
  Widget build(BuildContext context) {
    final status = current['status'] as String? ?? '—';
    final updatedAt = current['updatedAt'] as String?;
    return Card(
      color: AppColors.positive.withOpacity(0.08),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.cloud_done, color: AppColors.positive, size: 18),
                const SizedBox(width: 8),
                Text('Statut : $status', style: const TextStyle(fontWeight: FontWeight.w700)),
              ],
            ),
            if (updatedAt != null) ...[
              const SizedBox(height: 4),
              Text('Mise à jour le ${_formatDateTime(updatedAt)}', style: Theme.of(context).textTheme.bodySmall),
            ],
          ],
        ),
      ),
    );
  }
}

class _VersionCard extends StatelessWidget {
  const _VersionCard({required this.version});

  final SubmissionHistoryVersion version;

  @override
  Widget build(BuildContext context) {
    final status = version.snapshot['status'] as String? ?? '—';
    final color = version.isConflict ? AppColors.danger : AppColors.textMuted;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  version.isConflict ? Icons.warning_amber_rounded : Icons.history,
                  color: color,
                  size: 18,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    version.isConflict ? 'Conflit détecté' : _reasonLabel(version.reason),
                    style: TextStyle(fontWeight: FontWeight.w700, color: color),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text('Statut au moment de l\'archivage : $status', style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 2),
            Text(
              'Archivée le ${_formatDateTime(version.archivedAt.toIso8601String())}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }

  String _reasonLabel(String reason) {
    switch (reason) {
      case 'sync_update':
        return 'Remplacée par une synchronisation plus récente';
      case 'status_change':
        return 'Changement de statut';
      default:
        return reason;
    }
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.error, required this.onRetry});

  final Object? error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off, color: AppColors.danger, size: 32),
            const SizedBox(height: 12),
            const Text(
              'Impossible de récupérer l\'historique depuis le serveur.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text('$error', style: Theme.of(context).textTheme.bodySmall, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Réessayer'),
            ),
          ],
        ),
      ),
    );
  }
}

String _formatDateTime(String iso) {
  final dt = DateTime.parse(iso).toLocal();
  final d = dt.day.toString().padLeft(2, '0');
  final m = dt.month.toString().padLeft(2, '0');
  final h = dt.hour.toString().padLeft(2, '0');
  final min = dt.minute.toString().padLeft(2, '0');
  return '$d/$m/${dt.year} à $h:$min';
}
