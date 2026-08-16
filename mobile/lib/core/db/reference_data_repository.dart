import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;
import 'package:sqflite/sqflite.dart';

import 'app_database.dart';
import 'reference_data.dart';

/// Référentiels établissements / enseignants, disponibles hors-ligne en
/// SQLite pour faciliter la saisie de l'en-tête d'un formulaire (champs
/// "Etablissement" et "Enseignant") sans connexion internet.
///
/// Hydratés au premier lancement depuis les assets embarqués
/// (`assets/reference-data/*.json`, un petit jeu d'exemple). Aucun
/// endpoint backend ne les distribue pour l'instant : [hydrateFromAssets]
/// est conçu pour être remplacé, ou complété, par une synchronisation
/// serveur future sans changer la forme de la table (`synced_at` est déjà
/// prévu à cet effet).
class ReferenceDataRepository {
  const ReferenceDataRepository();

  Future<void> hydrateFromAssetsIfEmpty() async {
    final db = await AppDatabase.instance();
    final existing = Sqflite.firstIntValue(
      await db.rawQuery('SELECT COUNT(*) AS n FROM etablissements'),
    );
    if ((existing ?? 0) > 0) {
      return;
    }

    final etablissementsRaw = await rootBundle.loadString('assets/reference-data/etablissements.json');
    final enseignantsRaw = await rootBundle.loadString('assets/reference-data/enseignants.json');
    final etablissements = (jsonDecode(etablissementsRaw) as List<dynamic>)
        .map((e) => Etablissement.fromJson(e as Map<String, dynamic>))
        .toList();
    final enseignants = (jsonDecode(enseignantsRaw) as List<dynamic>)
        .map((e) => Enseignant.fromJson(e as Map<String, dynamic>))
        .toList();

    final now = DateTime.now().toIso8601String();
    final batch = db.batch();
    for (final etablissement in etablissements) {
      batch.insert('etablissements', {
        'id': etablissement.id,
        'nom': etablissement.nom,
        'code': etablissement.code,
        'province': etablissement.province,
        'sous_division': etablissement.sousDivision,
        'milieu': etablissement.milieu,
        'synced_at': now,
      }, conflictAlgorithm: ConflictAlgorithm.replace);
    }
    for (final enseignant in enseignants) {
      batch.insert('enseignants', {
        'id': enseignant.id,
        'nom': enseignant.nom,
        'etablissement_id': enseignant.etablissementId,
        'matiere': enseignant.matiere,
        'sexe': enseignant.sexe,
        'synced_at': now,
      }, conflictAlgorithm: ConflictAlgorithm.replace);
    }
    await batch.commit(noResult: true);
  }

  Future<List<Etablissement>> searchEtablissements(String query) async {
    final db = await AppDatabase.instance();
    final rows = query.trim().isEmpty
        ? await db.query('etablissements', orderBy: 'nom', limit: 50)
        : await db.query(
            'etablissements',
            where: 'nom LIKE ?',
            whereArgs: ['%${query.trim()}%'],
            orderBy: 'nom',
            limit: 50,
          );
    return rows.map(_etablissementFromRow).toList();
  }

  Future<List<Enseignant>> searchEnseignants(String query, {String? etablissementId}) async {
    final db = await AppDatabase.instance();
    final conditions = <String>[];
    final args = <Object?>[];
    if (query.trim().isNotEmpty) {
      conditions.add('nom LIKE ?');
      args.add('%${query.trim()}%');
    }
    if (etablissementId != null) {
      conditions.add('etablissement_id = ?');
      args.add(etablissementId);
    }
    final rows = await db.query(
      'enseignants',
      where: conditions.isEmpty ? null : conditions.join(' AND '),
      whereArgs: args.isEmpty ? null : args,
      orderBy: 'nom',
      limit: 50,
    );
    return rows.map(_enseignantFromRow).toList();
  }

  Etablissement _etablissementFromRow(Map<String, Object?> row) {
    return Etablissement(
      id: row['id']! as String,
      nom: row['nom']! as String,
      code: row['code'] as String?,
      province: row['province'] as String?,
      sousDivision: row['sous_division'] as String?,
      milieu: row['milieu'] as String?,
    );
  }

  Enseignant _enseignantFromRow(Map<String, Object?> row) {
    return Enseignant(
      id: row['id']! as String,
      nom: row['nom']! as String,
      etablissementId: row['etablissement_id'] as String?,
      matiere: row['matiere'] as String?,
      sexe: row['sexe'] as String?,
    );
  }
}
