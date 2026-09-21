import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import '../db/template_cache_repository.dart';
import 'common.dart';
import 'form_template.dart';

/// Charge les [FormTemplate] — disponibles hors-ligne via un cache SQLite
/// (`form_templates_cache`), lui-même hydraté depuis les assets embarqués
/// (copies de `shared/forms/*.json`, voir `scripts/sync-mobile-assets.sh`).
///
/// Le cache est comparé à la version embarquée dans l'application à
/// chaque chargement (`version` sémantique) et rafraîchi si celle-ci est
/// plus récente — évite de servir indéfiniment une configuration
/// obsolète après une mise à jour de l'application. Une prochaine
/// itération pourra réhydrater ce même cache depuis l'API backend
/// (`GET /form-templates`) sans changer cette interface : le cache
/// resterait alors la source servie, potentiellement plus récente que
/// les assets embarqués.
class FormTemplateRepository {
  const FormTemplateRepository({this.cache = const TemplateCacheRepository()});

  final TemplateCacheRepository cache;

  static const Map<FormCode, String> _assetPaths = {
    FormCode.c2: 'assets/form-templates/c2.json',
    FormCode.c3: 'assets/form-templates/c3.json',
    FormCode.c3b: 'assets/form-templates/c3b.json',
    FormCode.c3m: 'assets/form-templates/c3m.json',
    FormCode.c3das: 'assets/form-templates/c3_das.json',
  };

  Future<FormTemplate> load(FormCode code) async {
    final path = _assetPaths[code];
    if (path == null) {
      throw ArgumentError('Aucun template embarqué pour le formulaire "${code.code}".');
    }
    final raw = await rootBundle.loadString(path);
    final assetJson = jsonDecode(raw) as Map<String, dynamic>;

    final cached = await cache.find(code.code);
    if (cached != null && _compareVersions(cached['version'] as String, assetJson['version'] as String) >= 0) {
      return FormTemplate.fromJson(cached);
    }

    await cache.store(assetJson);
    return FormTemplate.fromJson(assetJson);
  }

  Future<List<FormTemplate>> loadAll() {
    return Future.wait(_assetPaths.keys.map(load));
  }

  /// Compare deux versions sémantiques ("1.2.0"). Retourne un entier
  /// positif si [a] > [b], négatif si [a] < [b], zéro si égales.
  static int _compareVersions(String a, String b) {
    final partsA = a.split('.').map(int.parse).toList();
    final partsB = b.split('.').map(int.parse).toList();
    for (var i = 0; i < 3; i++) {
      final diff = partsA[i] - partsB[i];
      if (diff != 0) return diff;
    }
    return 0;
  }
}
