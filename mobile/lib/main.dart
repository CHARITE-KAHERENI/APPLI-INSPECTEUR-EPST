import 'package:flutter/material.dart';

import 'core/models/form_template.dart';
import 'core/models/form_template_repository.dart';
import 'core/theme/app_theme.dart';
import 'features/dynamic_form/screens/dynamic_form_screen.dart';

void main() {
  runApp(const C3DigitalApp());
}

class C3DigitalApp extends StatelessWidget {
  const C3DigitalApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'c3-digital',
      theme: AppTheme.light,
      home: const HomeScreen(),
    );
  }
}

/// Écran d'accueil : liste les 5 formulaires IGE embarqués et ouvre
/// [DynamicFormScreen] pour celui choisi.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('c3-digital')),
      body: FutureBuilder<List<FormTemplate>>(
        future: const FormTemplateRepository().loadAll(),
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Erreur de chargement: ${snapshot.error}'));
          }
          final templates = snapshot.data ?? [];
          return ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: templates.length,
            itemBuilder: (context, index) {
              final template = templates[index];
              return ListTile(
                title: Text(template.name),
                subtitle: Text(
                  '${template.code.code} · v${template.version} · ${template.sections.length} section(s)',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => DynamicFormScreen(formCode: template.code)),
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}
