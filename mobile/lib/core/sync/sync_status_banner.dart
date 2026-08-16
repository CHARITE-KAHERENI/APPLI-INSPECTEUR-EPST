import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../theme/app_colors.dart';
import 'sync_engine.dart';

/// Bandeau de statut affiché en permanence en haut de l'application (voir
/// `main.dart`, `MaterialApp.builder`) — exigence : afficher clairement,
/// sur chaque écran, "Hors-ligne - sera synchronisé" ou "Synchronisé" avec
/// horodatage.
///
/// Distingue en réalité trois situations pour rester honnête sur l'état
/// réel de l'appareil :
/// - aucune connexion réseau détectée -> "Hors-ligne — sera synchronisé" ;
/// - connecté mais des actions restent à envoyer (ex : serveur injoignable
///   malgré une connexion active, ou synchronisation pas encore tentée)
///   -> "En attente de synchronisation" ;
/// - tout est envoyé et confirmé par le serveur -> "Synchronisé" +
///   horodatage de la dernière synchronisation réussie.
///
/// Un appui déclenche une tentative de synchronisation immédiate.
class SyncStatusBanner extends StatelessWidget {
  const SyncStatusBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final engine = context.watch<SyncEngine>();
    final status = _resolveStatus(engine);

    return Material(
      color: status.color,
      child: InkWell(
        onTap: engine.isSyncing ? null : () => engine.triggerSync(),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          child: Row(
            children: [
              if (engine.isSyncing)
                const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              else
                Icon(status.icon, size: 16, color: Colors.white),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  status.label,
                  style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w600),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (!engine.isSyncing) const Icon(Icons.sync, size: 15, color: Colors.white70),
            ],
          ),
        ),
      ),
    );
  }

  _BannerStatus _resolveStatus(SyncEngine engine) {
    if (engine.isSyncing) {
      return const _BannerStatus(
        label: 'Synchronisation en cours…',
        color: AppColors.accent,
        icon: Icons.sync,
      );
    }

    if (!engine.isOnline) {
      final suffix = engine.pendingCount > 0 ? ' (${engine.pendingCount} en attente)' : '';
      return _BannerStatus(
        label: 'Hors-ligne — sera synchronisé$suffix',
        color: AppColors.warning,
        icon: Icons.cloud_off,
      );
    }

    if (engine.pendingCount > 0) {
      return _BannerStatus(
        label: 'En attente de synchronisation (${engine.pendingCount})',
        color: AppColors.warning,
        icon: Icons.cloud_queue,
      );
    }

    final syncedAt = engine.lastSyncAt;
    final label = syncedAt != null ? 'Synchronisé à ${_formatTime(syncedAt)}' : 'Synchronisé';
    return _BannerStatus(label: label, color: AppColors.positive, icon: Icons.cloud_done);
  }

  String _formatTime(DateTime dt) {
    final local = dt.toLocal();
    final h = local.hour.toString().padLeft(2, '0');
    final m = local.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}

class _BannerStatus {
  const _BannerStatus({required this.label, required this.color, required this.icon});

  final String label;
  final Color color;
  final IconData icon;
}
