import 'dotenv/config';
import type { FormTemplate } from '@c3-digital/shared';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FormTemplateEntity } from '../../modules/form-templates/entities/form-template.entity';
import dataSource from '../data-source';

/**
 * Insère (ou met à jour) les templates C2, C3, C3B, C3M et C3_DAS dans
 * `form_templates` à partir des configurations JSON de `shared/forms`.
 *
 * Lit directement les fichiers JSON depuis le monorepo (plutôt que via le
 * package `@c3-digital/shared` compilé) pour rester utilisable dès le
 * développement local, sans nécessiter un `npm run build` préalable.
 *
 * Usage : npm run seed:form-templates
 */
const SHARED_FORMS_DIR = join(__dirname, '../../../../shared/forms');

const FORM_FILES = [
  'c2.json',
  'c3.json',
  'c3b.json',
  'c3m.json',
  'c3_das.json',
];

function loadTemplate(fileName: string): FormTemplate {
  const raw = readFileSync(join(SHARED_FORMS_DIR, fileName), 'utf-8');
  return JSON.parse(raw) as FormTemplate;
}

async function seed() {
  const templates = FORM_FILES.map(loadTemplate);

  await dataSource.initialize();
  const repository = dataSource.getRepository(FormTemplateEntity);

  for (const template of templates) {
    const existing = await repository.findOne({
      where: { code: template.code, version: template.version },
    });

    const entity = existing ?? new FormTemplateEntity();
    entity.code = template.code;
    entity.name = template.name;
    entity.version = template.version;
    entity.description = template.description ?? null;
    entity.isActive = template.isActive;
    entity.definition = {
      header: template.header,
      fieldGroups: template.fieldGroups,
      sections: template.sections,
      conversionTable: template.conversionTable,
      synthesis: template.synthesis,
      signatures: template.signatures,
    };

    await repository.save(entity);
    console.log(
      `✓ Template ${template.code} v${template.version} (${existing ? 'mis à jour' : 'créé'})`,
    );
  }

  await dataSource.destroy();
}

seed().catch((error) => {
  console.error('Échec du seed des form_templates :', error);
  process.exit(1);
});
