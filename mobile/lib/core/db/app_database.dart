import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

/// Ouvre (et migre) la base SQLite locale de l'application.
///
/// Une seule table pour l'instant : `form_drafts`, qui stocke les
/// formulaires en cours de remplissage (voir `FormDraftRepository`). Le
/// contenu détaillé (en-tête, sections, signatures) est stocké en JSON par
/// colonne, à l'image de la colonne `definition` JSONB du backend — cohérent
/// avec le reste du projet et suffisant pour un usage hors-ligne mobile.
class AppDatabase {
  AppDatabase._();

  static Database? _instance;

  static Future<Database> instance() async {
    final existing = _instance;
    if (existing != null) {
      return existing;
    }
    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, 'c3_digital.db');
    final db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
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
      },
    );
    _instance = db;
    return db;
  }

  /// Utile pour les tests : ferme et oublie l'instance ouverte.
  static Future<void> reset() async {
    final db = _instance;
    _instance = null;
    if (db != null) {
      await db.close();
    }
  }
}
