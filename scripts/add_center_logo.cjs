const pg = require('pg');
(async () => {
  const c = new pg.Client({host:'localhost',port:5433,user:'postgres',password:'root',database:'baderp'});
  await c.connect();
  await c.query(`ALTER TABLE center_config ADD COLUMN IF NOT EXISTS logo text`);
  console.log('center_config.logo column added');
  await c.end();
})();
