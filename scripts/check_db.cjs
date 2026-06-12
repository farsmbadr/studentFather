const { Pool } = require('pg');
const p = new Pool({host:'localhost',port:5433,user:'postgres',password:'root',database:'baderp'});
(async()=>{
  const cols = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'grades' ORDER BY ordinal_position");
  console.log('grades columns:', JSON.stringify(cols.rows));
  const rows = await p.query('SELECT * FROM grades');
  console.log('grades rows:', JSON.stringify(rows.rows));
  await p.end()
})();
