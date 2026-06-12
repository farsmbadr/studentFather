const pg = require('pg');
(async () => {
  const c = new pg.Client({host:'localhost',port:5433,user:'postgres',password:'root',database:'baderp'});
  await c.connect();
  const r = await c.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='students' AND column_name='deleted_at'");
  console.log(r.rows.length > 0 ? 'deleted_at exists' : 'deleted_at missing', r.rows);
  await c.end();
})();
