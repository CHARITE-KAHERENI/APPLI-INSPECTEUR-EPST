import 'package:connectivity_plus/connectivity_plus.dart';

/// Détection de la connectivité réseau (`connectivity_plus`) — ne garantit
/// pas à elle seule un accès internet réel (un réseau Wi-Fi peut être
/// connecté sans passerelle), donc `SyncEngine` confirme toujours la
/// joignabilité effective du serveur via `GET /sync/status` avant de
/// considérer l'appareil "en ligne".
class ConnectivityService {
  ConnectivityService({Connectivity? connectivity}) : _connectivity = connectivity ?? Connectivity();

  final Connectivity _connectivity;

  Future<bool> hasNetworkConnection() async {
    final results = await _connectivity.checkConnectivity();
    return _isConnected(results);
  }

  /// Émet `true`/`false` à chaque changement d'interface réseau.
  Stream<bool> get onConnectivityChanged {
    return _connectivity.onConnectivityChanged.map(_isConnected);
  }

  bool _isConnected(List<ConnectivityResult> results) {
    return results.any((r) => r != ConnectivityResult.none);
  }
}
