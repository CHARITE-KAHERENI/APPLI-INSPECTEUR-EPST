import 'dart:convert';

import 'package:sqflite/sqflite.dart';

import 'app_database.dart';

/// Cache SQLite des configurations de formulaires (`form_templates_cache`)
/// — rend les configurations disponibles hors-ligne au même titre que les
/// brouillons, plutôt que de dépendre uniquement des assets embarqués.
/// `FormTemplateRepository` hydrate ce cache depuis les assets au premier
/// accès à un template ; une synchronisation serveur future pourrait
/// réhydrater ce même cache sans changer son interface.
class TemplateCacheRepository {
  const TemplateCacheRepository();

  Future<Map<String, dynamic>?> find(String code) async {
    final db = await AppDatabase.instance();
    final rows = await db.query(
      'form_templates_cache',
      where: 'code = ?',
      whereArgs: [code],
      orderBy: 'cached_at DESC',
      limit: 1,
    );
    if (rows.isEmpty) {
      return null;
    }
    return jsonDecode(rows.first['definition_json']! as String) as Map<String, dynamic>;
  }

  Future<void> store(Map<String, dynamic> templateJson) async {
    final db = await AppDatabase.instance();
    await db.insert(
      'form_templates_cache',
      {
        'id': templateJson['id'] as String,
        'code': templateJson['code'] as String,
        'version': templateJson['version'] as String,
        'is_active': (templateJson['isActive'] as bool) ? 1 : 0,
        'definition_json': jsonEncode(templateJson),
        'cached_at': DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }
}
