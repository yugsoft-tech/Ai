import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function test() {
  await dataSource.initialize();
  const res = await dataSource.query(`
    SELECT id, created_at, title
    FROM chapters
    ORDER BY created_at DESC
    LIMIT 5;
  `);
  console.table(res);
  process.exit(0);
}
test();
