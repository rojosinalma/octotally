import { defineConfig } from 'drizzle-kit';

// `bun run db:generate` runs this and `drizzle.postgres.config.ts`: one migration set per engine.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './src/db/migrations/sqlite',
  strict: true,
  verbose: true,
});
