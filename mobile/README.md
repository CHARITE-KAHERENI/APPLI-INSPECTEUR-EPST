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
├── main.dart                          # Point d'entrée (écran de vérification des templates)
├── core/
│   ├── models/                        # Miroir Dart du modèle partagé shared/src/types
│   │   ├── common.dart                # FormCode, SignatoryRole...
│   │   ├── form_template.dart         # FormTemplate, sections, critères, barèmes
│   │   ├── form_submission.dart       # FormSubmission, réponses, signatures
│   │   └── form_template_repository.dart
│   └── theme/
└── features/                          # Modules à venir (saisie, synchronisation, auth...)

assets/form-templates/                 # Copies de shared/src/form-templates (voir ci-dessous)
```

## Modèle de données partagé

`lib/core/models/` est un **miroir manuel** de `shared/src/types/` (le
modèle TypeScript "source de vérité" du formulaire dynamique). Tant que
Dart ne consomme pas directement le JSON Schema partagé, ces deux
implémentations doivent rester alignées manuellement.

`assets/form-templates/c3.json` et `c3m.json` sont des copies de
`shared/src/form-templates/`. Après toute modification de ces fichiers,
lancer :

```bash
./scripts/sync-mobile-assets.sh
```

## Démarrage (une fois `flutter create .` exécuté)

```bash
flutter pub get
flutter run
flutter test
```
