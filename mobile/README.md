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
│   ├── auth/                          # Session de connexion (PROMPT 7, point 6 — voir ci-dessous)
│   │   ├── auth_models.dart           # AuthUser, UserRole — miroir de shared/src/types/auth.ts
│   │   ├── auth_api_client.dart       # POST /auth/login, GET /auth/me
│   │   └── auth_session.dart          # ChangeNotifier : jeton + profil, persistés (SharedPreferences)
│   ├── subscription/                  # Essai gratuit / abonnement (PROMPT 7)
│   │   ├── subscription_models.dart   # SubscriptionPlan, Subscriber, PaymentMethod — miroir shared
│   │   └── subscription_api_client.dart   # GET /subscriptions/plans, /me, POST /checkout
│   ├── ai/                            # Assistant de rédaction (PROMPT 8, point 1)
│   │   └── ai_api_client.dart         # POST /ai/writing-assistant
│   ├── sync/
│   │   ├── sync_models.dart           # SyncAction, SyncQueueStatus, SyncQueueEntry
│   │   ├── sync_queue_repository.dart # File de synchronisation locale (table sync_queue)
│   │   ├── connectivity_service.dart  # Détection réseau (connectivity_plus)
│   │   ├── sync_payload_builder.dart  # Brouillon local -> payload POST /sync/submissions
│   │   ├── sync_engine.dart           # Orchestration : écoute réseau, envoi, réessai avec backoff
│   │   └── sync_status_banner.dart    # Indicateur "Hors-ligne / Synchronisé" affiché en permanence
│   ├── utils/                         # generateLocalId, DeviceIdentity
│   ├── pdf/
│   │   ├── pdf_colors.dart            # Palette officielle -> PdfColor (package pdf)
│   │   └── pdf_generator.dart         # Génération PDF locale, hors-ligne (voir ci-dessous)
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
    │   └── widgets/                   # Pilules de note, badge de score, signature, champs d'en-tête,
    │                                   # AiSuggestionSheet (assistant de rédaction, PROMPT 8)
    ├── history/
    │   └── submission_history_screen.dart  # Consultation des versions archivées (conflits de sync)
    ├── pdf/
    │   └── pdf_preview_screen.dart    # Aperçu / partage / impression du PDF généré (package printing)
    ├── auth/
    │   └── login_screen.dart          # Connexion (POST /auth/login) — accessible depuis le profil
    ├── profile/
    │   └── profile_screen.dart        # Identité + statut d'abonnement, bouton "Choisir une formule"
    └── subscription/
        └── plan_selection_screen.dart # Sélection de formule + paiement (mobile money / carte)

assets/form-templates/                 # Copies de shared/forms (voir ci-dessous)
assets/reference-data/                 # Jeu d'exemple établissements/enseignants (voir ci-dessous)
assets/branding/                       # Logo IGE (copie de shared/assets/branding/, voir PDF ci-dessous)
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

## Génération PDF (hors-ligne)

Le bouton "Générer le PDF" de l'écran de synthèse (`SynthesisStep`) ouvre
`PdfPreviewScreen`, qui affiche l'aperçu du PDF construit entièrement en
local par `InspectionPdfGenerator` (`core/pdf/pdf_generator.dart`, package
`pdf`) — aucune connexion requise, y compris pour un brouillon jamais
synchronisé. Depuis cet aperçu (package `printing`), l'inspecteur peut
imprimer, partager ou exporter le fichier sans connexion.

Reproduit le même contenu que le PDF généré côté serveur (voir
`backend/src/modules/pdf/pdf-template.service.ts`) : en-tête RDC /
ministère / logo IGE, bloc d'identification, groupes de champs et
sections interclassés par code officiel, grille d'évaluation avec notes
et observations, tableau de conversion + évaluation synthétique,
signatures avec date et lieu, et — si l'inspecteur en a ajouté — un
encart distinct en fin de document, *"Observations complémentaires de
l'inspecteur (hors grille officielle)"*.

**Différence assumée avec la version serveur** : une mise en page plus
simple (une seule colonne d'identification plutôt que les 4 zones
juxtaposées du rendu HTML backend) — voir le commentaire en tête de
`pdf_generator.dart`. Le contenu reste complet et identique ; seule la
disposition visuelle est simplifiée, pour limiter le risque d'erreur non
détectée dans un environnement de développement sans SDK Flutter pour
vérifier le rendu à la compilation.

Le logo IGE (`assets/branding/ige_logo.png`) et le champ "lieu" de
signature (`SignaturePadField`, à côté de la zone de dessin) sont
nouveaux dans cette itération — ce dernier complète `SignatureDraft` pour
que "Fait à ... le ..." puisse être affiché sur le PDF plutôt que laissé
en blanc.

## Connexion & abonnement (PROMPT 7)

Point d'entrée **additif**, distinct de la saisie hors-ligne : un bouton
"Profil" (icône compte, en haut à droite de l'écran d'accueil) ouvre
`LoginScreen` si aucune session n'est active, sinon `ProfileScreen`
directement. Le reste de l'application (formulaires, synchronisation,
PDF local) reste utilisable sans connexion ni compte, exactement comme
avant cette itération — `/sync/*` reste volontairement ouvert (voir
"Ce qui n'est pas couvert" dans `backend/README.md`).

- `AuthSession` (`core/auth/auth_session.dart`, `ChangeNotifier` fourni
  via `Provider` dans `main.dart`) gère `POST /auth/login`, persiste le
  jeton + le profil en local (`shared_preferences`) pour rester connecté
  d'un lancement à l'autre, et revalide en arrière-plan via
  `GET /auth/me` (déconnexion automatique si le jeton n'est plus valide).
- `ProfileScreen` affiche l'identité du compte et, pour un rôle
  facturable (`chef_etablissement`/`inspecteur` — voir
  `UserRole.isBillable`), l'état de son abonnement
  (`GET /subscriptions/me`) : essai en cours, formule active, ou lecture
  seule avec le message d'explication du blocage de création
  d'inspection.
- `PlanSelectionScreen` liste les formules (`GET /subscriptions/plans`)
  et le choix du mode de paiement (M-Pesa, Orange Money, Airtel Money,
  carte bancaire), puis ouvre la transaction (`POST
  /subscriptions/checkout`). Comme pour un paiement mobile money réel,
  la confirmation est asynchrone (webhook côté serveur) : l'écran
  affiche les instructions renvoyées, et l'utilisateur revient sur son
  profil (tirer-pour-actualiser) pour voir le statut mis à jour une fois
  le paiement confirmé.

**Note sécurité** : le jeton est stocké via `shared_preferences` (non
chiffré), un compromis assumé pour cette itération — voir le
commentaire en tête de `auth_session.dart` pour le durcissement
attendu (`flutter_secure_storage`) avant un déploiement réel.

## Assistant de rédaction IA (PROMPT 8)

Bouton "Suggestion IA" dans la zone "conseils" de chaque section notée
(`SectionStep`) : envoie les notes brutes déjà saisies dans ce champ à
`POST /ai/writing-assistant`, et affiche la reformulation dans une feuille
modale (`AiSuggestionSheet`) — éditable, avec "Régénérer" (nouvel appel) et
"Accepter" (remplace le contenu du champ "conseils"). Deux conditions
avant l'appel, chacune avec un message explicite plutôt qu'un blocage
silencieux :

- **Connexion internet** : vérifiée via `ConnectivityService` avant
  l'appel — hors-ligne, un dialogue "Fonction IA indisponible hors-ligne"
  s'affiche avec un bouton "Continuer sans IA" (aucun blocage de la
  saisie, purement informatif).
- **Session active** : l'assistant de rédaction exige un jeton JWT (même
  session que le profil/abonnement, voir "Connexion & abonnement"
  ci-dessus) — un inspecteur non connecté voit un message l'invitant à se
  connecter depuis le profil, avec la même option de continuer sans IA.

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

## Tests (PROMPT 9)

`test/` complète `flutter test` avec la saisie hors-ligne complète des 5
formulaires, le calcul des scores/mentions, la génération PDF et la file
de synchronisation locale — voir `test/scoring_all_forms_test.dart`,
`test/pdf_generator_test.dart`, `test/sync_queue_repository_test.dart`,
`test/dynamic_form_controller_test.dart`. Les tests SQLite utilisent
`sqflite_common_ffi` (voir `test/support/sqflite_ffi_setup.dart`) — pas
besoin d'un appareil/émulateur réel pour `flutter test`.

**Exécutés avec succès** (36/36) avec le SDK Flutter stable installé a
posteriori — cette exécution a révélé et corrigé plusieurs bugs réels,
jamais détectés faute d'environnement d'exécution jusqu'ici :

- `AppDatabase.reset()` ne supprimait pas le fichier SQLite sous-jacent
  (seulement la connexion) : les fichiers de test s'exécutant en
  parallèle par défaut avec `flutter test`, plusieurs suites
  partageaient le même fichier sur disque, causant des données qui
  fuitaient d'un test à l'autre et des erreurs I/O aléatoires — corrigé
  en supprimant le fichier et en le renommant de façon unique à chaque
  `reset()`.
- Génération PDF du formulaire **C2** : `PdfTooBigPageException` (plus
  de 80 pages). C2 a jusqu'à ~40 critères sur une seule section (contre
  ~5-9 pour les autres formulaires) ; le tableau des critères était
  imbriqué dans un `pw.Container`/`pw.Column`, qui doivent tenir en
  entier sur une page — corrigé en renvoyant les widgets de section à
  plat, pour que seul le `pw.Table` (le seul à savoir scinder ses
  lignes) porte la pagination.
- `PaymentMethod.mpesa` (enum) et `CardTheme` (renommé `CardThemeData`
  dans les versions récentes de Flutter) : deux erreurs de compilation
  qui empêchaient tout `flutter test` de démarrer.

Ces corrections seront validées une nouvelle fois lors du premier build
réel (`flutter build apk`, voir "Déploiement" ci-dessous).

## Guide de démarrage rapide pour l'inspecteur (PROMPT 9)

`docs/guide-demarrage-inspecteur.md` (à la racine du repo, avec une
version imprimable `docs/guide-demarrage-inspecteur.html`) — une page en
français simple : installation de l'APK, remplissage d'un formulaire en
5 étapes, réassurance sur le mode hors-ligne. À distribuer avec l'APK aux
inspecteurs pilotes de Butembo.

## Déploiement — APK signé pour la distribution pilote (PROMPT 9)

Voir `mobile/scripts/README.md` : génération du keystore d'upload,
configuration de la signature Gradle, puis
`./mobile/scripts/build-release-apk.sh <URL_API>` pour produire
`build/app/outputs/flutter-apk/app-release.apk`, distribué directement
aux inspecteurs pilotes de Butembo (hors Play Store dans un premier
temps).
