// drizzle-kit writes `REFERENCES "public"."items"` into Postgres migrations. Octotally runs in any
// schema (DATABASE_SCHEMA, picked through search_path), so every `"public".` prefix is removed.
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(import.meta.dir, '../src/db/migrations/postgres');
for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
  const file = path.join(dir, name);
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replaceAll('"public".', '');
  if (after !== before) {
    fs.writeFileSync(file, after);
    console.log(`unqualify: ${name}`);
  }
}
