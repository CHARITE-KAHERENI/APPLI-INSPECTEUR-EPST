/**
 * Stub de `puppeteer-core` pour les tests e2e (voir `test/jest-e2e.json`,
 * `moduleNameMapper`). `puppeteer-core` est distribué en ESM pur : son
 * import statique fait échouer le chargement de `AppModule` sous Jest/
 * ts-jest (qui ne transforme pas les fichiers de `node_modules`), alors
 * qu'aucun des tests e2e actuels n'exerce réellement la génération PDF
 * (Puppeteer/Chromium) — seul le chargement du module doit réussir.
 */
module.exports = {
  __esModule: true,
  default: {
    launch: () => {
      throw new Error('puppeteer-core est stubé dans les tests e2e — PdfService ne doit pas être exercé ici.');
    },
  },
};
