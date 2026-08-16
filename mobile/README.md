# c3_digital (mobile)

Application mobile **Flutter** (Android + iOS) du projet c3-digital,
destinée aux inspecteurs pour la saisie **hors-ligne** des formulaires
IGE (C2, C3, C3B, C3M, C3_DAS) sur le terrain, avec synchronisation vers
le backend une fois la connexion rétablie.

## ⚠️ Étape requise avant le premier build

Ce dossier a été initialisé à la main (`pubspec.yaml` + `lib/`) sans le SDK
Flutter disponible dans cet environnement. **Avant de lancer l'app**,
générer les projets natifs Android/iOS avec le SDK Flutter installé :

```bash
cd mobile
flutter create . --project-name c3_digital --platforms=android,ios --org cd.gouv.ige
flutter pub get
```

Cela ajoute les dossiers `android/` et `ios/` (projets Gradle/Xcode) sans
toucher à `lib/`, `pubspec.yaml` ni `assets/` déjà en place.

## Structure

```
lib/
├── main.dart                          # Point d'entrée ; fournit SyncEngine, affiche SyncStatusBanner
├── core/
│   ├── models/                        # Miroir Dart du modèle partagé shared/src/types
│   │   ├── common.dart                # FormCode, SignatoryRole...
│   │   ├── form_template.dart         # FormTemplate, sections, ConversionTable, SynthesisTemplate
│   │   ├── form_submission.dart       # FormSubmission (format d'échange avec le backend)
│   │   ├── form_template_repository.dart  # Chargement des templates, cache SQLite hors-ligne
│   │   └── scoring.dart               # Port Dart de shared/src/scoring.ts
│   ├── db/
│   │   ├── app_database.dart          # Ouverture + migrations SQLite (brouillons, cache, référentiels, file)
│   │   ├── form_draft_repository.dart # CRUD des brouillons locaux
│   │   ├── template_cache_repository.dart   # Cache local des configurations de formulaires
│   │   ├── reference_data.dart              # Modèles Etablissement / Enseignant
│   │   └── reference_data_repository.dart   # Référentiels hors-ligne (établissements/enseignants)
│   ├── api/
│   │   ├── api_config.dart            # URL de base de l'API backend
│   │   └── sync_api_client.dart       # POST /sync/submissions, GET /sync/status, GET .../history
│   ├── sync/
│   │   ├── sync_models.dart           # SyncAction, SyncQueueStatus, SyncQueueEntry
│   │   ├── sync_queue_repository.dart # File de synchronisation locale (table sync_queue)
│   │   ├── connectivity_service.dart  # Détection réseau (connectivity_plus)
│   │   ├── sync_payload_builder.dart  # Brouillon local -> payload POST /sync/submissions
│   │   ├── sync_engine.dart           # Orchestration : écoute réseau, envoi, réessai avec backoff
│   │   └── sync_status_banner.dart    # Indicateur "Hors-ligne / Synchronisé" affiché en permanence
│   ├── utils/                         # generateLocalId, DeviceIdentity
│   └── theme/                         # AppColors (palette officielle) + AppTheme
└── features/
    ├── dynamic_form/                  # Moteur de rendu dynamique des formulaires
    │   ├── models/form_draft.dart     # Brouillon local en cours de saisie (SQLite)
    │   ├── state/dynamic_form_controller.dart   # ChangeNotifier (Provider)
    │   ├── screens/
    │   │   ├── dynamic_form_screen.dart  # Écran générique : identification -> sections -> synthèse
    │   │   ├── identification_step.dart
    │   │   ├── section_step.dart
    │   │   └── synthesis_step.dart
    │   └── widgets/                   # Pilules de note, badge de score, signature, champs d'en-tête...
    └── history/
        └── submission_history_screen.dart  # Consultation des versions archivées (conflits de sync)

assets/form-templates/                 # Copies de shared/forms (voir ci-dessous)
assets/reference-data/                 # Jeu d'exemple établissements/enseignants (voir ci-dessous)
```

## Moteur de rendu dynamique (`DynamicFormScreen`)

Un seul écran génère l'intégralité de la saisie pour n'importe lequel des
5 formulaires, à partir de sa seule configuration JSON — aucun code
spécifique à un formulaire donné.

```dart
Navigator.push(context, MaterialPageRoute(
  builder: (_) => DynamicFormScreen.forId('c3_das'), // ou formCode: FormCode.c3
));
```

Déroulé : **identification** (en-tête commun + groupes de champs non
notés type "Activité(s) inspectée(s)") → **une étape par section** (notes
0-4 en pilules, observation par critère, observations personnalisées
ajoutées librement — visuellement distinctes des critères officiels et
jamais fusionnées avec eux — puis conseils de la section) →
**synthèse** (score par section, mention finale, signatures tactiles des
signataires attendus par le formulaire).

Le score de chaque section, et le score global, sont recalculés en temps
réel à chaque note saisie (`core/models/scoring.dart`, même tableau de
conversion que `shared/src/scoring.ts`).

**Persistance** : `DynamicFormController` sauvegarde le brouillon en
SQLite (`core/db/`) à chaque modification — immédiatement pour les
actions discrètes (note, signature, ajout/suppression d'observation), et
avec un très léger différé (300 ms) pour la saisie de texte, pour ne rien
perdre en cas de fermeture de l'app ou de coupure de courant sans écrire
sur le disque à chaque frappe. Rouvrir l'écran reprend automatiquement le
dernier brouillon non soumis pour ce formulaire.

**Palette** : `core/theme/app_colors.dart` centralise les 5 couleurs
officielles (bleu marine `#1F4E78`, bleu `#2E74B5`, vert `#1E8E5A`,
orange `#C77700`, rouge `#C0392B`) — à réutiliser plutôt que d'introduire
de nouvelles couleurs ailleurs dans l'app.

**Pas encore implémenté** (prochaine itération) : écran listant tous les
brouillons de l'appareil (l'app reprend aujourd'hui le dernier brouillon
non soumis d'un formulaire donné, mais rien n'affiche encore l'ensemble
des formulaires en cours ou terminés), authentification, écran de
paramètres pour configurer l'URL du serveur (actuellement fixée par
`core/api/api_config.dart`).

## Mode hors-ligne et synchronisation

Toutes les données nécessaires à la saisie sont disponibles sans
connexion : brouillons en cours et terminés, configurations des 5
formulaires, référentiels établissements/enseignants — tout vit en SQLite
(`core/db/app_database.dart`, table par table détaillée ci-dessous).
`ReferenceDataRepository.hydrateFromAssetsIfEmpty()` copie le jeu
d'exemple `assets/reference-data/*.json` en base au premier lancement ;
`FormTemplateRepository` fait de même pour les templates
(`form_templates_cache`), en comparant la version de l'asset embarqué à
celle du cache pour ne jamais servir indéfiniment une configuration
obsolète après une mise à jour de l'app.

**File de synchronisation (`sync_queue`)** : chaque action à synchroniser
(nouveau formulaire, mise à jour, signature — `SyncAction`) est
enregistrée par `SyncQueueRepository.enqueue`, avec un statut
`en_attente` / `en_cours` / `synchronisé` / `erreur`. Les entrées
`en_attente` pour un même brouillon sont fusionnées entre elles (pas de
doublon lors d'une saisie prolongée hors-ligne) : `SyncEngine` relit
toujours l'état *courant* du brouillon au moment de l'envoi, une seule
entrée suffit donc à garantir que la dernière version sera transmise.

**`SyncEngine`** (fourni en `Provider` racine dans `main.dart`, démarré
via `start()`) écoute la connectivité (`connectivity_plus`) et déclenche
une synchronisation dès qu'une connexion est détectée — puis confirme la
joignabilité réelle du serveur via `GET /sync/status` avant d'envoyer
quoi que ce soit (une interface réseau active ne garantit pas un accès
internet réel). En cas d'échec, un réessai automatique est programmé avec
un délai croissant (5 s, 10 s, 20 s... jusqu'à 5 min, réinitialisé après
un envoi réussi) ; une minuterie de secours toutes les 2 minutes couvre
les cas où aucun évènement de connectivité ne serait émis. Chaque
modification de formulaire (`DynamicFormController.onQueueChanged`)
déclenche aussi une tentative immédiate si l'appareil est déjà en ligne.

**Indicateur de statut** : `SyncStatusBanner` est affiché en permanence
au-dessus de chaque écran (`MaterialApp.builder` dans `main.dart`, pas
besoin de l'ajouter écran par écran) et affiche "Hors-ligne — sera
synchronisé" (hors connexion), "En attente de synchronisation" (connecté
mais pas encore confirmé par le serveur) ou "Synchronisé à HH:mm" (tout
envoyé et confirmé) — un appui déclenche une synchronisation immédiate.

**Conflits** : si un même formulaire a été modifié à la fois localement
et côté serveur (ex: changement de statut via une future interface web),
le backend applique tout de même la version locale la plus récente mais
archive la version serveur remplacée dans `form_submission_versions`
(voir `backend/README.md`) et marque la réponse `conflict: true`.
`SubmissionHistoryScreen` (accessible depuis l'écran de synthèse une fois
le formulaire synchronisé au moins une fois) consulte `GET
/sync/submissions/:id/history` pour permettre à l'IGE de retrouver la
version remplacée.

**Configuration** : l'URL du backend se règle au build via
`--dart-define=C3_DIGITAL_API_BASE_URL=https://...` (voir
`core/api/api_config.dart`) ; par défaut `http://10.0.2.2:3000`, l'alias
que l'émulateur Android utilise pour joindre le `localhost` de la machine
hôte en développement — à remplacer avant tout déploiement réel.

## Modèle de données partagé

`lib/core/models/` est un **miroir manuel** de `shared/src/types/` (le
modèle TypeScript "source de vérité" du formulaire dynamique). Tant que
Dart ne consomme pas directement le JSON Schema partagé, ces deux
implémentations doivent rester alignées manuellement.

`assets/form-templates/*.json` sont des copies de `shared/forms/`. Après
toute modification de ces fichiers, lancer :

```bash
./scripts/sync-mobile-assets.sh
```

## Démarrage (une fois `flutter create .` exécuté)

```bash
flutter pub get
flutter run
flutter test
```
