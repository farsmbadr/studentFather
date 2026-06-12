const pg = require('pg');
(async () => {
  const c = new pg.Client({host:'localhost',port:5433,user:'postgres',password:'root',database:'baderp'});
  await c.connect();
  await c.query("ALTER TABLE students ADD COLUMN IF NOT EXISTS booking_deposit numeric DEFAULT 0");
  await c.query("ALTER TABLE students ADD COLUMN IF NOT EXISTS school text DEFAULT ''");
  await c.query("ALTER TABLE students ADD COLUMN IF NOT EXISTS division text DEFAULT ''");
  await c.query("ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_job text DEFAULT ''");
  await c.query("ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date date");
  await c.query("ALTER TABLE students ADD COLUMN IF NOT EXISTS email text DEFAULT ''");
  console.log('Columns added');
  await c.end();
})();
