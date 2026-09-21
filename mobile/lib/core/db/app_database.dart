import 'dart:ffi';
import 'dart:io';
import 'dart:math';

import 'package:path/path.dart' as p;
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// Ouvre (et migre) la base SQLite locale de l'application — le socle du
/// fonctionnement hors-ligne complet : formulaires en cours et terminés,
/// configurations de formulaires, référentiels établissements/enseignants,
/// et la file de synchronisation, sont tous disponibles localement sans
/// connexion internet.
///
/// Comme côté backend, le contenu détaillé est stocké en JSON par colonne
/// (`*_json`) plutôt que finement relationnel — cohérent avec le reste du
/// projet et suffisant pour un usage hors-ligne mobile.
class AppDatabase {
  AppDatabase._();

  static const int schemaVersion = 2;

  static Database? _instance;

  // En production, toujours le même fichier (persistance entre les
  // lancements de l'app). `reset()` — utilisé uniquement par les tests —
  // le fait pointer vers un nouveau nom à chaque appel : `flutter test`
  // exécute les fichiers de test en parallèle par défaut, et sans ce
  // renommage, deux suites (ex: sync_queue_repository_test.dart et
  // dynamic_form_controller_test.dart) partageraient le même fichier
  // SQLite sur disque (chemin fixe via getDatabasesPath()), avec des
  // écritures concurrentes provoquant des erreurs I/O aléatoires ou des
  // données d'un test qui fuitent dans un autre.
  static String _fileName = 'c3_digital.db';

  static bool _desktopSqliteFactoryInitialized = false;

  /// Sur Windows/macOS/Linux, `sqflite` n'a pas de plugin natif (celui-ci
  /// n'existe que sur Android/iOS, via un canal de plateforme) : sans
  /// ceci, `getDatabasesPath()`/`openDatabase()` lèvent `Bad state:
  /// databaseFactory not initialized` au tout premier accès à la base.
  /// `sqflite_common_ffi` (déjà utilisé par les tests, voir
  /// `test/support/sqflite_ffi_setup.dart`) fournit l'implémentation
  /// SQLite pure Dart nécessaire sur ces plateformes.
  static void _ensureDesktopSqliteFactory() {
    if (_desktopSqliteFactoryInitialized) return;
    if (Platform.isLinux || Platform.isWindows || Platform.isMacOS) {
      _preloadSystemSqlite3();
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
    }
    _desktopSqliteFactoryInitialized = true;
  }

  /// Charge explicitement la bibliothèque SQLite du système dans le
  /// processus avant d'initialiser `sqflite_common_ffi`.
  ///
  /// `package:sqlite3` (>=3.x, dont dépend `sqflite_common_ffi`) résout
  /// sa bibliothèque native via le système "native assets" de Dart —
  /// fiable avec `flutter test`/`flutter run`, mais pas encore avec
  /// `flutter build linux/windows/macos --release` au moment de l'écriture
  /// (l'actif construit par le hook n'est pas copié dans le bundle final ;
  /// suivre https://github.com/dart-lang/native/issues pour l'évolution
  /// de ce comportement). Ouvrir la bibliothèque nous-mêmes au démarrage
  /// la rend visible à la recherche de symboles "process-wide" que
  /// `package:sqlite3` tente déjà en repli — ce qui suffit à la faire
  /// fonctionner sans dépendre du bundling natif.
  ///
  /// Linux et macOS fournissent SQLite avec le système d'exploitation
  /// (aucune installation supplémentaire requise) ; **Windows ne le
  /// fournit pas** — `sqlite3.dll` doit être placé à côté de l'exécutable
  /// (voir `.github/workflows/desktop-build.yml`, étape de téléchargement
  /// pour la cible Windows).
  static void _preloadSystemSqlite3() {
    final candidates = switch (true) {
      _ when Platform.isLinux => const ['libsqlite3.so.0', 'libsqlite3.so'],
      _ when Platform.isMacOS => const ['libsqlite3.dylib', '/usr/lib/libsqlite3.dylib'],
      _ when Platform.isWindows => const ['sqlite3.dll'],
      _ => const <String>[],
    };
    for (final name in candidates) {
      try {
        DynamicLibrary.open(name);
        return;
      } on ArgumentError {
        // Essaie le nom candidat suivant.
      }
    }
  }

  static Future<String> _path() async {
    _ensureDesktopSqliteFactory();
    final dbPath = await getDatabasesPath();
    return p.join(dbPath, _fileName);
  }

  static Future<Database> instance() async {
    final existing = _instance;
    if (existing != null) {
      return existing;
    }
    final path = await _path();
    final db = await openDatabase(
      path,
      version: schemaVersion,
      onCreate: (db, version) async {
        await _createV1(db);
        await _createV2(db);
      },
      onUpgrade: (db, oldVersion, newVersion) async {
        if (oldVersion < 2) {
          await _createV2(db);
        }
      },
    );
    _instance = db;
    return db;
  }

  static Future<void> _createV1(Database db) async {
    // Formulaires en cours de remplissage ET formulaires terminés — le
    // cycle de vie complet (brouillon -> soumis -> synchronise) vit dans
    // cette même table (voir DraftStatus).
    await db.execute('''
      CREATE TABLE form_drafts (
        id TEXT PRIMARY KEY,
        form_code TEXT NOT NULL,
        template_id TEXT NOT NULL,
        template_version TEXT NOT NULL,
        status TEXT NOT NULL,
        header_json TEXT NOT NULL,
        sections_json TEXT NOT NULL,
        signatures_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    ''');
    await db.execute('CREATE INDEX idx_form_drafts_form_code ON form_drafts (form_code)');
    await db.execute('CREATE INDEX idx_form_drafts_status ON form_drafts (status)');
  }

  static Future<void> _createV2(Database db) async {
    // --- Suivi de synchronisation sur form_drafts -----------------------
    // server_updated_at : dernier `updatedAt` serveur connu pour ce
    //   formulaire (transmis en tant que `baseServerUpdatedAt` lors de la
    //   prochaine synchronisation, pour permettre la détection de
    //   conflit côté serveur — voir backend/src/modules/sync).
    // last_synced_at : horodatage local de la dernière synchronisation
    //   réussie, affiché à l'utilisateur ("Synchronisé le ...").
    for (final column in ['server_updated_at', 'last_synced_at']) {
      await db.execute('ALTER TABLE form_drafts ADD COLUMN $column TEXT');
    }

    // --- Configurations de formulaires (cache local) ---------------------
    // Hydraté depuis les assets embarqués au premier lancement ; prêt à
    // être réhydraté depuis le backend si les référentiels évoluent.
    await db.execute('''
      CREATE TABLE form_templates_cache (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        version TEXT NOT NULL,
        is_active INTEGER NOT NULL,
        definition_json TEXT NOT NULL,
        cached_at TEXT NOT NULL
      )
    ''');
    await db.execute('CREATE INDEX idx_form_templates_cache_code ON form_templates_cache (code)');

    // --- Référentiels établissements / enseignants ------------------------
    await db.execute('''
      CREATE TABLE etablissements (
        id TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        code TEXT,
        province TEXT,
        sous_division TEXT,
        milieu TEXT,
        synced_at TEXT
      )
    ''');
    await db.execute('CREATE INDEX idx_etablissements_nom ON etablissements (nom)');

    await db.execute('''
      CREATE TABLE enseignants (
        id TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        etablissement_id TEXT,
        matiere TEXT,
        sexe TEXT,
        synced_at TEXT,
        FOREIGN KEY (etablissement_id) REFERENCES etablissements (id)
      )
    ''');
    await db.execute('CREATE INDEX idx_enseignants_nom ON enseignants (nom)');
    await db.execute('CREATE INDEX idx_enseignants_etablissement_id ON enseignants (etablissement_id)');

    // --- File de synchronisation ------------------------------------------
    // Une entrée par action à synchroniser (nouveau formulaire, mise à
    // jour, signature) — voir core/sync/sync_queue_repository.dart.
    await db.execute('''
      CREATE TABLE sync_queue (
        id TEXT PRIMARY KEY,
        draft_id TEXT NOT NULL,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (draft_id) REFERENCES form_drafts (id)
      )
    ''');
    await db.execute('CREATE INDEX idx_sync_queue_status ON sync_queue (status)');
    await db.execute('CREATE INDEX idx_sync_queue_draft_id ON sync_queue (draft_id)');
  }

  /// Utile pour les tests : ferme l'instance ouverte, supprime le
  /// fichier SQLite sous-jacent, puis fait pointer les prochains appels
  /// à [instance] vers un nom de fichier tout neuf — voir le
  /// commentaire de [_fileName] pour l'isolation entre suites de tests
  /// exécutées en parallèle.
  static Future<void> reset() async {
    final db = _instance;
    _instance = null;
    if (db != null) {
      await db.close();
    }
    await deleteDatabase(await _path());
    _fileName = 'c3_digital_test_${Random().nextInt(1 << 32)}.db';
  }
}
