import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import 'common.dart';
import 'form_template.dart';

/// Charge les [FormTemplate] embarqués dans les assets de l'application.
///
/// Ces fichiers sont des copies de `shared/src/form-templates/*.json`
/// (voir `scripts/sync-mobile-assets.sh`). Une prochaine itération pourra
/// remplacer/compléter cette source par un appel à l'API backend
/// (`GET /form-templates`) avec mise en cache locale pour l'usage hors-ligne.
class FormTemplateRepository {
  const FormTemplateRepository();

  static const Map<FormCode, String> _assetPaths = {
    FormCode.c3: 'assets/form-templates/c3.json',
    FormCode.c3m: 'assets/form-templates/c3m.json',
  };

  Future<FormTemplate> load(FormCode code) async {
    final path = _assetPaths[code];
    if (path == null) {
      throw ArgumentError('Aucun template embarqué pour le formulaire "${code.code}".');
    }
    final raw = await rootBundle.loadString(path);
    return FormTemplate.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  Future<List<FormTemplate>> loadAll() {
    return Future.wait(_assetPaths.keys.map(load));
  }
}
