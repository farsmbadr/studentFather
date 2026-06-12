const { Client } = require('pg');
(async () => {
  const c = new Client({ host:'localhost',port:5433,user:'postgres',password:'root',database:'baderp' });
  await c.connect();
  const r = await c.query("SELECT id,name,code,monthly_fee FROM students WHERE code='1094'");
  const s = r.rows[0];
  console.log('Student:', s.name, s.code, 'fee:', s.monthly_fee);
  const p = await c.query("SELECT * FROM payments WHERE student_id=$1 ORDER BY date DESC", [s.id]);
  console.log('Payments count:', p.rows.length);
  p.rows.forEach((row, i) => console.log(`  ${i+1}: amount=${row.amount}, date=${row.date}, year-month=${String(row.date).substring(0,7)}`));
  console.log('Payment dates start with current month?', p.rows.map(r => String(r.date).startsWith('2026-06')));
  await c.end();
})();
