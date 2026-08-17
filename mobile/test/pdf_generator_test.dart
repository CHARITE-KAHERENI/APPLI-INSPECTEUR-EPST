import 'dart:convert';
import 'dart:io';

import 'package:c3_digital/core/models/common.dart';
import 'package:c3_digital/core/models/form_template.dart';
import 'package:c3_digital/core/pdf/pdf_generator.dart';
import 'package:c3_digital/features/dynamic_form/models/form_draft.dart';
import 'package:flutter_test/flutter_test.dart';

/// Génération PDF hors-ligne (PROMPT 9, point 1) — smoke test des 5
/// formulaires : `InspectionPdfGenerator` (package `pdf`, pur Dart) doit
/// produire un document PDF valide et non trivial pour chacun, sans
/// exception, à partir d'un brouillon entièrement rempli. La fidélité
/// visuelle détaillée (structure, libellés) est validée côté serveur —
/// voir `backend/src/modules/pdf/pdf-template.service.spec.ts`, la mise
/// en page mobile étant volontairement plus simple (voir le commentaire
/// en tête de `pdf_generator.dart`).
const _formFiles = ['c2.json', 'c3.json', 'c3b.json', 'c3m.json', 'c3_das.json'];

FormTemplate _loadTemplate(String fileName) {
  final raw = File('assets/form-templates/$fileName').readAsStringSync();
  return FormTemplate.fromJson(jsonDecode(raw) as Map<String, dynamic>);
}

FormDraft _buildFullDraft(FormTemplate template) {
  final now = DateTime.now();
  return FormDraft(
    id: 'test-draft-${template.code.id}',
    formCode: template.code,
    templateId: template.id,
    templateVersion: template.version,
    header: {for (final field in template.header.fields) field.key: 'Valeur de test'},
    sections: template.sections
        .map(
          (section) => SectionDraft(
            sectionId: section.id,
            criteria: {for (final c in section.criteria) c.id: const CriterionDraft(score: 3)},
            advice: section.adviceZone.enabled ? 'Conseil de test.' : '',
          ),
        )
        .toList(),
    signatures: template.signatures.roles.map((r) => SignatureDraft(role: r.role)).toList(),
    status: DraftStatus.soumis,
    createdAt: now,
    updatedAt: now,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  for (final fileName in _formFiles) {
    test('génère un PDF valide et non trivial pour $fileName', () async {
      final template = _loadTemplate(fileName);
      final draft = _buildFullDraft(template);

      final bytes = await const InspectionPdfGenerator().generate(template: template, draft: draft);

      // En-tête magique "%PDF" — confirme un document PDF structurellement
      // valide plutôt qu'un flux vide ou corrompu.
      expect(String.fromCharCodes(bytes.take(4)), '%PDF');
      // Un document aussi long qu'un vrai formulaire IGE (plusieurs
      // sections, dizaines de critères) ne peut pas tenir en quelques
      // octets : ce seuil détecterait un rendu tronqué ou vide.
      expect(bytes.length, greaterThan(2000));
    });
  }
}
