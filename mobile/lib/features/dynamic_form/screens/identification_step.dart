import 'package:flutter/material.dart';

import '../../../core/models/form_template.dart';
import '../state/dynamic_form_controller.dart';
import '../widgets/header_field_widget.dart';

/// Écran d'identification : l'en-tête commun (inspecteur, établissement,
/// entité inspectée, année scolaire, numéro de rapport...) et les groupes
/// de champs non notés du formulaire (ex : "Activité(s) inspectée(s)").
class IdentificationStep extends StatelessWidget {
  const IdentificationStep({super.key, required this.controller});

  final DynamicFormController controller;

  @override
  Widget build(BuildContext context) {
    final template = controller.template;
    final sortedHeaderFields = [...template.header.fields]..sort((a, b) => a.order.compareTo(b.order));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _FieldGroupCard(title: 'Informations générales', fields: sortedHeaderFields, controller: controller),
        for (final group in template.fieldGroups)
          _FieldGroupCard(
            title: group.title,
            description: group.description,
            fields: group.fields,
            controller: controller,
          ),
      ],
    );
  }
}

class _FieldGroupCard extends StatelessWidget {
  const _FieldGroupCard({required this.title, this.description, required this.fields, required this.controller});

  final String title;
  final String? description;
  final List<FormHeaderField> fields;
  final DynamicFormController controller;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            if (description != null) ...[
              const SizedBox(height: 4),
              Text(description!, style: Theme.of(context).textTheme.bodySmall),
            ],
            const SizedBox(height: 12),
            for (final field in fields) ...[
              HeaderFieldWidget(
                field: field,
                initialValue: controller.draft.header[field.key],
                onChanged: (value) => controller.updateHeaderField(field.key, value),
              ),
              const SizedBox(height: 12),
            ],
          ],
        ),
      ),
    );
  }
}
