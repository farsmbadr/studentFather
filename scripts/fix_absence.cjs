const { Client } = require('pg');
(async () => {
  const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
  await c.connect();
  await c.query("ALTER TABLE absence_records ADD COLUMN IF NOT EXISTS group_name text DEFAULT ''");
  await c.query("ALTER TABLE absence_records ADD COLUMN IF NOT EXISTS student_id text DEFAULT ''");
  console.log('Columns added');
  await c.end();
})();
