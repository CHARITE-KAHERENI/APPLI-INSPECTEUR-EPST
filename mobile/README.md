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
├── main.dart                          # Point d'entrée ; accueil -> DynamicFormScreen
├── core/
│   ├── models/                        # Miroir Dart du modèle partagé shared/src/types
│   │   ├── common.dart                # FormCode, SignatoryRole...
│   │   ├── form_template.dart         # FormTemplate, sections, ConversionTable, SynthesisTemplate
│   │   ├── form_submission.dart       # FormSubmission (format d'échange avec le backend)
│   │   ├── form_template_repository.dart
│   │   └── scoring.dart               # Port Dart de shared/src/scoring.ts
│   ├── db/
│   │   ├── app_database.dart          # Ouverture SQLite (table form_drafts)
│   │   └── form_draft_repository.dart # CRUD des brouillons locaux
│   └── theme/                         # AppColors (palette officielle) + AppTheme
└── features/
    └── dynamic_form/                  # Moteur de rendu dynamique des formulaires
        ├── models/form_draft.dart     # Brouillon local en cours de saisie (SQLite)
        ├── state/dynamic_form_controller.dart   # ChangeNotifier (Provider)
        ├── screens/
        │   ├── dynamic_form_screen.dart  # Écran générique : identification -> sections -> synthèse
        │   ├── identification_step.dart
        │   ├── section_step.dart
        │   └── synthesis_step.dart
        └── widgets/                   # Pilules de note, badge de score, signature, champs d'en-tête...

assets/form-templates/                 # Copies de shared/forms (voir ci-dessous)
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

**Pas encore implémenté** (prochaine itération) : synchronisation des
brouillons soumis avec `POST /form-submissions` (backend), liste des
brouillons en cours, authentification.

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
