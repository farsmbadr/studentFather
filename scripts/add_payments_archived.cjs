const pg = require('pg');
(async () => {
  const c = new pg.Client({host:'localhost',port:5433,user:'postgres',password:'root',database:'baderp'});
  await c.connect();
  await c.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false`);
  console.log('payments.is_archived column added');
  await c.end();
})();
