import 'dart:math';

final Random _idRandom = Random();

/// Identifiant local suffisamment unique (brouillon, entrée de file de
/// synchronisation, observation personnalisée...) — pas besoin d'unicité
/// globale, seulement locale à l'appareil.
String generateLocalId(String prefix) {
  final now = DateTime.now().microsecondsSinceEpoch;
  final salt = _idRandom.nextInt(1 << 32);
  return '$prefix-$now-$salt';
}
