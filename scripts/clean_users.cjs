const {Client} = require('pg');
(async () => {
  const c = new Client({host:'localhost',port:5433,user:'postgres',password:'root',database:'baderp'});
  await c.connect();
  await c.query("DELETE FROM app_users WHERE id != 'a6bf197e-5b3f-4da2-9163-a88c9e1c9cd1'");
  const r = await c.query('SELECT COUNT(*) FROM app_users');
  console.log('المستخدمين المتبقين:', r.rows[0].count);
  await c.end();
})();
