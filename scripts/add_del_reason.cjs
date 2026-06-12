const pg = require('pg');
(async () => {
  const c = new pg.Client({host:'localhost',port:5433,user:'postgres',password:'root',database:'baderp'});
  await c.connect();
  await c.query("ALTER TABLE students ADD COLUMN IF NOT EXISTS deletion_reason text DEFAULT ''");
  console.log('deletion_reason column added');
  await c.end();
})();
