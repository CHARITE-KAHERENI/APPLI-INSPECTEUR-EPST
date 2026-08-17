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
});
