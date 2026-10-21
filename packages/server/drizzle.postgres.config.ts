import { defineConfig } from 'drizzle-kit';

// Generation needs no database. Keep `schema.pg.ts` in step with `schema.ts`; `scripts/unqualify.ts`
// then strips the `"public".` prefixes drizzle-kit writes, so the files apply to any schema.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.pg.ts',
  out: './src/db/migrations/postgres',
  strict: true,
  verbose: true,
});
