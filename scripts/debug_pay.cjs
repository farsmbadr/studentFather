const { Client } = require('pg');
(async () => {
  const c = new Client({ host:'localhost',port:5433,user:'postgres',password:'root',database:'baderp' });
  await c.connect();
  const r = await c.query("SELECT id,name,code,monthly_fee FROM students WHERE code='1094'");
  const s = r.rows[0];
  console.log('Student:', JSON.stringify(s, null, 2));
  if (s) {
    const p = await c.query("SELECT * FROM payments WHERE student_id=$1 ORDER BY date", [s.id]);
    console.log('Payments:', JSON.stringify(p.rows, null, 2));
  }
  await c.end();
})();
