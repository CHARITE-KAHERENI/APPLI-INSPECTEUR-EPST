import 'dart:convert';

import 'package:sqflite/sqflite.dart';

import '../models/common.dart';
import '../../features/dynamic_form/models/form_draft.dart';
import 'app_database.dart';

/// Persistance locale (SQLite) des brouillons de formulaire — voir
/// `FormDraft`. Chaque appel à [save] fait un UPSERT complet de la ligne :
/// c'est la méthode appelée à chaque modification de champ par
/// `DynamicFormController`, pour ne rien perdre en cas de fermeture de
/// l'application ou de coupure de courant.
class FormDraftRepository {
  const FormDraftRepository();

  Future<void> save(FormDraft draft) async {
    final db = await AppDatabase.instance();
    await db.insert(
      'form_drafts',
      {
        'id': draft.id,
        'form_code': draft.formCode.code,
        'template_id': draft.templateId,
        'template_version': draft.templateVersion,
        'status': draft.status.name,
        'header_json': jsonEncode(draft.header),
        'sections_json': jsonEncode(draft.sections.map((s) => s.toJson()).toList()),
        'signatures_json': jsonEncode(draft.signatures.map((s) => s.toJson()).toList()),
        'created_at': draft.createdAt.toIso8601String(),
        'updated_at': draft.updatedAt.toIso8601String(),
        'server_updated_at': draft.serverUpdatedAt?.toIso8601String(),
        'last_synced_at': draft.lastSyncedAt?.toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<FormDraft?> findById(String id) async {
    final db = await AppDatabase.instance();
    final rows = await db.query('form_drafts', where: 'id = ?', whereArgs: [id], limit: 1);
    if (rows.isEmpty) {
      return null;
    }
    return _fromRow(rows.first);
  }

  /// Le brouillon "brouillon" (non soumis) le plus récent pour un
  /// formulaire donné — utilisé pour reprendre une saisie interrompue sans
  /// passer explicitement un `draftId`.
  Future<FormDraft?> findLatestOpenDraft(FormCode formCode) async {
    final db = await AppDatabase.instance();
    final rows = await db.query(
      'form_drafts',
      where: 'form_code = ? AND status = ?',
      whereArgs: [formCode.code, DraftStatus.brouillon.name],
      orderBy: 'updated_at DESC',
      limit: 1,
    );
    if (rows.isEmpty) {
      return null;
    }
    return _fromRow(rows.first);
  }

  /// Tous les brouillons (en cours ou terminés) — l'ensemble des données
  /// disponibles hors-ligne, quel que soit leur statut de synchronisation.
  Future<List<FormDraft>> findAll() async {
    final db = await AppDatabase.instance();
    final rows = await db.query('form_drafts', orderBy: 'updated_at DESC');
    return rows.map(_fromRow).toList();
  }

  /// Brouillons dont les modifications locales n'ont pas encore été
  /// confirmées comme reçues par le serveur — pour le badge "en attente"
  /// affiché par [SyncStatusBanner].
  Future<int> countPendingSync() async {
    final db = await AppDatabase.instance();
    final rows = await db.rawQuery(
      'SELECT COUNT(*) AS n FROM form_drafts WHERE last_synced_at IS NULL OR updated_at > last_synced_at',
    );
    return Sqflite.firstIntValue(rows) ?? 0;
  }

  Future<void> delete(String id) async {
    final db = await AppDatabase.instance();
    await db.delete('form_drafts', where: 'id = ?', whereArgs: [id]);
  }

  FormDraft _fromRow(Map<String, Object?> row) {
    return FormDraft(
      id: row['id']! as String,
      formCode: FormCode.fromCode(row['form_code']! as String),
      templateId: row['template_id']! as String,
      templateVersion: row['template_version']! as String,
      status: DraftStatus.fromValue(row['status']! as String),
      header: Map<String, dynamic>.from(jsonDecode(row['header_json']! as String) as Map),
      sections: (jsonDecode(row['sections_json']! as String) as List<dynamic>)
          .map((s) => SectionDraft.fromJson(s as Map<String, dynamic>))
          .toList(),
      signatures: (jsonDecode(row['signatures_json']! as String) as List<dynamic>)
          .map((s) => SignatureDraft.fromJson(s as Map<String, dynamic>))
          .toList(),
      createdAt: DateTime.parse(row['created_at']! as String),
      updatedAt: DateTime.parse(row['updated_at']! as String),
      serverUpdatedAt: row['server_updated_at'] != null ? DateTime.parse(row['server_updated_at']! as String) : null,
      lastSyncedAt: row['last_synced_at'] != null ? DateTime.parse(row['last_synced_at']! as String) : null,
    );
  }
}
