import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

// CRITICAL: Ensure .env is explicitly loaded into process.env before creating the Client
dotenv.config();

/**
 * Run SQL migrations manually: npm run migration:run
 * Supports cloud databases (Neon.tech) via connectionString.
 */
async function runMigration() {
  const isCloud = !!process.env.DATABASE_URL;

  const client = new Client(
    isCloud
      ? {
        connectionString: process.env.DATABASE_URL,
        // Neon DB requires SSL connections. This config prevents handshake errors.
        ssl: { rejectUnauthorized: false },
      }
      : {
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        user: process.env.DB_USERNAME ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
        database: process.env.DB_DATABASE ?? 'yugsoft_tech',
      }
  );

  console.log(`Connecting to database via ${isCloud ? 'Neon Cloud URL' : 'Localhost'}...`);
  await client.connect();

  // 1. Run pgvector setup
  const sqlPath1 = join(__dirname, 'migrations', '001-enable-pgvector.sql');
  const sql1 = readFileSync(sqlPath1, 'utf8');
  await client.query(sql1);
  console.log('Migration 001-enable-pgvector applied successfully.');

  // 2. Run HNSW index setup
  const sqlPath2 = join(__dirname, 'migrations', '002-hnsw-index.sql');
  const sql2 = readFileSync(sqlPath2, 'utf8');
  await client.query(sql2);
  console.log('Migration 002-hnsw-index applied successfully.');

  await client.end();
  console.log('🎉 All migrations completed successfully on Neon Cloud!');
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});