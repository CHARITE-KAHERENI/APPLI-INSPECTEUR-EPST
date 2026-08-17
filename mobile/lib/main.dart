import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/auth/auth_session.dart';
import 'core/db/reference_data_repository.dart';
import 'core/models/form_template.dart';
import 'core/models/form_template_repository.dart';
import 'core/sync/sync_engine.dart';
import 'core/sync/sync_status_banner.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/login_screen.dart';
import 'features/dynamic_form/screens/dynamic_form_screen.dart';
import 'features/profile/profile_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Hydrate les référentiels établissements/enseignants dès le démarrage
  // s'ils ne le sont pas encore (premier lancement) — ne bloque pas le
  // premier affichage, ces données ne sont consultées qu'à la saisie de
  // l'en-tête d'un formulaire.
  unawaited(const ReferenceDataRepository().hydrateFromAssetsIfEmpty());

  final authSession = AuthSession();
  unawaited(authSession.restore());

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider<SyncEngine>(create: (_) => SyncEngine()..start()),
        ChangeNotifierProvider<AuthSession>.value(value: authSession),
      ],
      child: const C3DigitalApp(),
    ),
  );
}

class C3DigitalApp extends StatelessWidget {
  const C3DigitalApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'c3-digital',
      theme: AppTheme.light,
      home: const HomeScreen(),
      // Bandeau de statut de synchronisation affiché en permanence,
      // au-dessus de chaque écran de l'application (voir
      // `SyncStatusBanner`).
      builder: (context, child) {
        return Column(
          children: [
            const SafeArea(bottom: false, child: SyncStatusBanner()),
            Expanded(child: child ?? const SizedBox.shrink()),
          ],
        );
      },
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
      appBar: AppBar(
        title: const Text('c3-digital'),
        actions: [
          IconButton(
            icon: const Icon(Icons.account_circle_outlined),
            tooltip: 'Profil',
            onPressed: () {
              final session = context.read<AuthSession>();
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => session.isAuthenticated ? const ProfileScreen() : const LoginScreen(),
                ),
              );
            },
          ),
        ],
      ),
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
