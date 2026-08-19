import 'dart:math';

import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

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

  static Future<String> _path() async {
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
