import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// Bascule `sqflite` sur son implémentation FFI (pure Dart, SQLite embarqué
/// via `sqlite3`) pour les tests : `flutter test` n'exécute pas sur un
/// appareil/émulateur réel, donc l'implémentation par défaut de `sqflite`
/// (canal de plateforme Android/iOS) n'est pas disponible. Un seul appel
/// suffit pour toute la suite de tests (voir `AppDatabase`, qui n'a besoin
/// d'aucun changement : il consomme `databaseFactory` de façon transparente).
void setUpSqfliteFfi() {
  sqfliteFfiInit();
  databaseFactory = databaseFactoryFfi;
}
