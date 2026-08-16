# @c3-digital/shared

Modèle de données partagé du projet **c3-digital**, consommé par le backend
(NestJS), le web (React) et — via le même schéma JSON — l'application
mobile (Flutter).

## Contenu

```
shared/src/
├── types/                       # Types TypeScript du modèle de "formulaire dynamique"
│   ├── common.ts                 # FormCode, CriterionScore, types de champs...
│   ├── form-template.ts          # FormTemplate, FormSectionTemplate, SectionBareme...
│   ├── form-submission.ts        # FormSubmission, SectionResponse, SignatureResponse...
│   └── index.ts
├── scoring.ts                    # Calcul note -> pourcentage -> mention (partagé backend/web)
├── schemas/                      # JSON Schema (draft 2020-12), miroir des types TS
│   ├── form-template.schema.json
│   └── form-submission.schema.json
└── form-templates/               # Configurations JSON des formulaires officiels IGE
    ├── c3.json                   # C3  - rapport d'inspection d'un enseignant
    └── c3m.json                  # C3M - rapport d'inspection du personnel de maîtrise/direction
```

## Le modèle de "formulaire dynamique"

Un même modèle (`FormTemplate`) représente les 5 formulaires officiels de
l'IGE (**C2, C3, C3B, C3M, C3_DAS**), afin d'éviter cinq implémentations
séparées côté applications. Chaque template définit :

- **`header`** — l'en-tête : champs communs (inspecteur, établissement,
  enseignant/entité inspectée, année scolaire, numéro de rapport) plus des
  champs spécifiques au formulaire (`common: false`).
- **`sections`** — une ou plusieurs sections, chacune avec :
  - `criteria` — des critères notés de **0 à 4** ;
  - `bareme` — le barème de conversion note → pourcentage → mention,
    propre à la section (`mentionRules` doit couvrir 0-100 sans trou) ;
  - `adviceZone` — une zone "conseils" en texte libre.
- **`signatures`** — les trois signataires attendus (`enseignant`,
  `chef_etablissement`, `inspecteur`).

Une soumission remplie (`FormSubmission`) référence un `templateId` et
porte un `status` : `brouillon` → `soumis` → `synchronise` (ce dernier
statut correspond à la synchronisation réussie depuis le mobile,
potentiellement hors-ligne, vers le backend).

## État des fichiers de configuration

`c3.json` et `c3m.json` sont des **squelettes valides** (conformes à
`form-template.schema.json`, vérifié via ajv) mais leur contenu pédagogique
(libellés des sections/critères, barèmes officiels) est marqué
`PLACEHOLDER` : il sera complété avec le contenu détaillé fourni pour
chaque formulaire. Les configurations pour **C2, C3B et C3_DAS** suivront
le même schéma dans une prochaine itération.

## Utilisation

```ts
import { FormTemplate, computeSectionScore } from '@c3-digital/shared';
import c3Template from '@c3-digital/shared/src/form-templates/c3.json';
```

```bash
npm run build      # compile vers dist/ (types + JS)
npm run typecheck  # vérification TypeScript sans émission
```
