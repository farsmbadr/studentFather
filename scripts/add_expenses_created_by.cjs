const pg = require('pg');
(async () => {
  const c = new pg.Client({host:'localhost',port:5433,user:'postgres',password:'root',database:'baderp'});
  await c.connect();
  await c.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by text NOT NULL DEFAULT ''`);
  console.log('expenses.created_by column added');
  await c.end();
})();
