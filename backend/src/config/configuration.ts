export interface AppConfig {
  port: number;
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
    synchronize: boolean;
    ssl: boolean;
  };
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
  };
  subscriptions: {
    /** Secret partagé attendu sur `POST /subscriptions/webhooks/:provider` — voir `WebhookSecretGuard`. */
    webhookSecret: string;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    username: process.env.DATABASE_USER ?? 'c3digital',
    password: process.env.DATABASE_PASSWORD ?? 'c3digital',
    name: process.env.DATABASE_NAME ?? 'c3_digital',
    // Ne JAMAIS activer synchronize en production : le schéma est géré via
    // les migrations TypeORM (src/database/migrations).
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
    ssl: process.env.DATABASE_SSL === 'true',
  },
  auth: {
    // Valeur de repli utilisable uniquement en développement local — TOUJOURS
    // définir JWT_SECRET en production (voir .env.example).
    jwtSecret: process.env.JWT_SECRET ?? 'dev-only-insecure-secret-change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  },
  subscriptions: {
    // Valeur de repli utilisable uniquement en développement local — TOUJOURS
    // définir SUBSCRIPTIONS_WEBHOOK_SECRET en production, à remplacer par la
    // vérification de signature propre à chaque passerelle réelle une fois
    // les comptes marchands connectés (voir backend/README.md).
    webhookSecret:
      process.env.SUBSCRIPTIONS_WEBHOOK_SECRET ??
      'dev-only-insecure-webhook-secret-change-me',
  },
});
