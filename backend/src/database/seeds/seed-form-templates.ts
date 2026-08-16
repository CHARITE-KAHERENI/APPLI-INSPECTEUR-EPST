import 'dotenv/config';
import type { FormTemplate } from '@c3-digital/shared';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FormTemplateEntity } from '../../modules/form-templates/entities/form-template.entity';
import dataSource from '../data-source';

/**
 * Insère (ou met à jour) les templates C3 et C3M dans `form_templates` à
 * partir des configurations JSON de `shared/src/form-templates`.
 *
 * Lit directement les fichiers JSON depuis le monorepo (plutôt que via le
 * package `@c3-digital/shared` compilé) pour rester utilisable dès le
 * développement local, sans nécessiter un `npm run build` préalable.
 *
 * Usage : npm run seed:form-templates
 */
const SHARED_FORM_TEMPLATES_DIR = join(
  __dirname,
  '../../../../shared/src/form-templates',
);

function loadTemplate(fileName: string): FormTemplate {
  const raw = readFileSync(join(SHARED_FORM_TEMPLATES_DIR, fileName), 'utf-8');
  return JSON.parse(raw) as FormTemplate;
}

async function seed() {
  const templates = [loadTemplate('c3.json'), loadTemplate('c3m.json')];

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
      sections: template.sections,
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
