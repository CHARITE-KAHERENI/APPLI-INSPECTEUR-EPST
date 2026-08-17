import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { existsSync } from 'node:fs';
import puppeteer, { Browser } from 'puppeteer-core';

/**
 * Chemins usuels d'un exécutable Chromium, essayés dans l'ordre si
 * `PDF_CHROMIUM_EXECUTABLE_PATH` n'est pas défini. Le premier
 * (`/opt/pw-browsers/chromium`) est celui de l'environnement de
 * développement de ce projet (Chromium pré-installé pour Playwright) ;
 * les suivants couvrent les installations système courantes (ex: `apt-get
 * install chromium` dans une image Docker de déploiement).
 */
const CANDIDATE_EXECUTABLE_PATHS = [
  '/opt/pw-browsers/chromium',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
];

function resolveExecutablePath(): string {
  const envPath = process.env.PDF_CHROMIUM_EXECUTABLE_PATH;
  if (envPath) {
    if (!existsSync(envPath)) {
      throw new InternalServerErrorException(
        `PDF_CHROMIUM_EXECUTABLE_PATH="${envPath}" ne pointe vers aucun fichier.`,
      );
    }
    return envPath;
  }

  const found = CANDIDATE_EXECUTABLE_PATHS.find((candidate) =>
    existsSync(candidate),
  );
  if (found) {
    return found;
  }

  throw new InternalServerErrorException(
    'Aucun exécutable Chromium trouvé pour générer le PDF. Installez Chromium ' +
      '(ex: "apt-get install chromium") et/ou définissez la variable ' +
      "d'environnement PDF_CHROMIUM_EXECUTABLE_PATH — voir backend/README.md.",
  );
}

/**
 * Génère un PDF à partir d'un document HTML via Chromium headless
 * (`puppeteer-core` : pilote uniquement, sans navigateur embarqué — voir
 * `resolveExecutablePath` pour la résolution de l'exécutable).
 *
 * Le navigateur est démarré une seule fois et réutilisé entre les appels
 * (`getBrowser`), un nouvel onglet étant ouvert et fermé pour chaque PDF.
 */
@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browserPromise: Promise<Browser> | null = null;

  async generatePdf(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      // Aucune ressource externe à attendre : le logo est intégré en
      // base64 dans le HTML (voir `PdfTemplateService`), donc `load`
      // suffit (et c'est la seule valeur acceptée par `setContent`).
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '8mm', bottom: '14mm', left: '8mm' },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate:
          '<div style="font-size:7px;width:100%;text-align:center;color:#5B6B79;">' +
          'c3-digital — Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer
        .launch({
          executablePath: resolveExecutablePath(),
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        })
        .catch((error: unknown) => {
          this.browserPromise = null;
          throw error;
        });
    }
    return this.browserPromise;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browserPromise) {
      const browser = await this.browserPromise.catch(() => null);
      await browser?.close();
      this.browserPromise = null;
    }
  }
}
