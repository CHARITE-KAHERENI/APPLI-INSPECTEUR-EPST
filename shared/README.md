# @c3-digital/shared

Modèle de données partagé du projet **c3-digital**, consommé par le backend
(NestJS), le web (React) et — via un miroir Dart maintenu manuellement —
l'application mobile (Flutter).

## Contenu

```
shared/
├── src/
│   ├── types/                     # Types TypeScript du modèle de "formulaire dynamique"
│   │   ├── common.ts               # FormCode, CriterionScore, types de champs...
│   │   ├── form-template.ts        # FormTemplate, sections, ConversionTable, SynthesisTemplate...
│   │   ├── form-submission.ts      # FormSubmission, SectionResponse, SignatureResponse...
│   │   └── index.ts
│   ├── scoring.ts                  # Calcul note -> pourcentage -> mention (partagé backend/web)
│   └── schemas/                    # JSON Schema (draft 2020-12), miroir des types TS
│       ├── form-template.schema.json
│       └── form-submission.schema.json
├── forms/                          # Configurations JSON des 5 formulaires officiels IGE
│   ├── c2.json         # Inspection administrative
│   ├── c3.json         # Inspection pédagogique (leçon théorique)
│   ├── c3b.json        # Inspection pédagogique (leçon pratique)
│   ├── c3m.json        # Inspection pédagogique (enseignement maternel)
│   └── c3_das.json     # Inspection pédagogique (séquence didactique)
└── assets/branding/
    └── ige-logo.png    # Logo IGE (voir note ci-dessous)
```

**`assets/branding/ige-logo.png`** : recadré depuis l'en-tête des documents
Word officiels fournis (fond blanc rendu transparent), faute de fichier
logo source séparé. Fidèle à l'original mais issu d'une capture d'écran à
~400 dpi — suffisant pour un usage en en-tête de PDF généré (taille
d'affichage réduite), pas pour une impression grand format ; à remplacer
par un fichier vectoriel officiel si l'IGE en fournit un. Utilisé par le
service de génération PDF du backend (`backend/src/modules/pdf/`) et par
la génération PDF locale du mobile (`mobile/assets/branding/`) — voir
`scripts/sync-mobile-assets.sh` pour la copie vers le mobile.

## Le modèle de "formulaire dynamique"

Un même modèle (`FormTemplate`) représente les 5 formulaires officiels de
l'IGE (**C2, C3, C3B, C3M, C3_DAS**), afin d'éviter cinq implémentations
séparées côté applications. Chaque template définit :

- **`header`** — l'en-tête : champs communs (inspecteur, établissement,
  enseignant/entité inspectée, année scolaire, numéro de rapport) plus des
  champs spécifiques au formulaire (`common: false`), avec leur numérotation
  officielle (`code`, ex: "01", "02"...).
- **`fieldGroups`** — groupes de champs non notés hors en-tête (ex :
  "Activité(s) inspectée(s)" pour C3/C3B/C3_DAS ; "1.1 Implantation" /
  "1.2 Structure", notées sur une échelle E/TB/B/AB/M, pour C2).
- **`sections`** — une ou plusieurs sections, chacune avec :
  - `criteria` — des critères notés de **0 à 4**, avec leur numérotation
    officielle (`code`, ex: "2.1.1") ;
  - `observationsLabel` — libellé de la colonne d'observation par critère
    (toujours "Observations" dans les documents actuels) ;
  - `adviceZone` — une zone "conseils" en texte libre ;
  - **`custom_fields`** — toujours vide (`[]`) dans les configurations
    officielles ; réservé aux ajouts futurs de l'utilisateur, jamais
    fusionné avec `criteria`.
- **`conversionTable`** — LE barème de conversion note → pourcentage →
  mention du formulaire, **partagé par toutes ses sections** (un seul
  "Tableau de conversion" par document officiel, pas un barème par
  section). Deux modes :
  - `lookup_by_criteria_count` (C3, C3B, C3_DAS, C3M) : la note brute
    d'une section est convertie via `rows`, une ligne par nombre de
    critères N (2 à 10) — c'est le mécanisme réellement imprimé sur les
    documents officiels (ex: une section de 8 critères note son total
    brut sur la ligne "N=8"). La **même table est réutilisée** pour
    convertir l'évaluation synthétique finale, en indexant sur le nombre
    de sections notées (`synthesis.conversionCriteriaCount`, 10 pour
    C3/C3B/C3_DAS).
  - `percentage_only` (C2) : conversion directe via
    `(note obtenue / note maximale) × 100`, comparé aux `bands` — utilisé
    quand une section compte trop de critères pour un tableau indexé par N
    (67 critères pour "Gestion administrative" par exemple). Certaines
    bandes portent une `secondaryMention` (ex: C2 utilise à la fois
    "ELITE/TRES BON/BON/ASSEZ BON/MEDIOCRE" pour les sous-domaines et
    "GRANDE DISTINCTION/DISTINCTION/SATISFACTION/BALANCE/ECHEC" pour
    l'appréciation finale globale).
- **`synthesis`** — le bloc de synthèse finale (tableau récapitulatif des
  sections, libellé et aide de la mention finale, libellé du sceau).
- **`signatures`** — les signataires attendus (`enseignant`,
  `chef_etablissement`, `inspecteur` — C2 n'a pas de rôle `enseignant`, le
  formulaire portant sur l'établissement et non un enseignant).

La logique de calcul (`computeSectionScore`, `convertRawScore`) est
implémentée une fois dans `shared/src/scoring.ts` et réutilisée par le
backend et le web ; son algorithme est réimplémenté à l'identique en Dart
pour le mobile (`mobile/lib/core/models/form_template.dart`).

Une soumission remplie (`FormSubmission`) référence un `templateId` et
porte un `status` : `brouillon` → `soumis` → `synchronise` (ce dernier
statut correspond à la synchronisation réussie depuis le mobile,
potentiellement hors-ligne, vers le backend).

## État des fichiers de configuration

Les 5 formulaires sont des **transcriptions complètes et vérifiées** des
documents officiels fournis (C2_REVUE, C3_REVUE, C3B_REVUE, C3M_REVUE,
C3_DAS_REVUE) : libellés, numérotation et tableaux de conversion
respectent exactement les documents sources, y compris leurs
particularités :

- **C3M** désigne l'inspection pédagogique de l'**enseignement maternel**
  ("M" = Maternel), pas le "personnel de maîtrise/direction" comme
  supposé avant réception du document officiel.
- Le tableau de conversion imprimé sur C3_REVUE, C3B_REVUE et C3M_REVUE
  comporte une coquille d'impression à la ligne N=8, colonne "3"
  ("25 – 2", chiffre final tronqué) : la valeur `22` utilisée dans
  `c3.json`/`c3b.json`/`c3m.json` est **déduite par calcul** (les 5 plages
  d'une ligne doivent couvrir exactement `0..(4×N)` sans trou ni
  chevauchement), pas recopiée du document — vérifié par un test de
  cohérence dans le générateur source de ces fichiers.
- C3_DAS_REVUE contient une coquille similaire ("2.11.4. RGANISATION...",
  lettre "O" manquante) et une numérotation de critère dupliquée
  ("2.8.6" apparaît deux fois) ; C3M_REVUE a la même particularité
  ("2.9.7" apparaît deux fois, pour "Fichier d'observation" et "Résultats
  aux tests") : transcrites telles quelles, sans reformulation.
- Le titre imprimé de la section "2.10. Evaluation de l'acquis" de
  C3_DAS_REVUE ne correspond pas à ses critères (qui portent en réalité
  sur les documents des apprenants, comme le confirme la ligne
  "2.11.10. DOCUMENTS DES APPRENANTS" du tableau de synthèse) — transcrit
  tel quel également.
- `c3.json` est basé sur C3_REVUE (qui met à jour C3_R/C3_V : nom du
  ministère, libellé du critère 2.9.3, libellé de la ligne de synthèse
  2.11.4).

## Utilisation

```ts
import { FormTemplate, computeSectionScore } from '@c3-digital/shared';
import c3Template from '@c3-digital/shared/forms/c3.json';
```

```bash
npm run build      # compile vers dist/ (types + JS)
npm run typecheck  # vérification TypeScript sans émission
```
