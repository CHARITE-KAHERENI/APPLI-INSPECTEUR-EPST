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

  Future<List<FormDraft>> findAll() async {
    final db = await AppDatabase.instance();
    final rows = await db.query('form_drafts', orderBy: 'updated_at DESC');
    return rows.map(_fromRow).toList();
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
    );
  }
}
