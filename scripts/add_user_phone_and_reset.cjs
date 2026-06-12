const { Client } = require('pg');

async function main() {
  const db = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
  await db.connect();

  await db.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone text`);
  await db.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false`);

  console.log('Added phone + must_change_password to app_users');
  await db.end();
}

main().catch(e => { console.error(e); process.exit(1); });
