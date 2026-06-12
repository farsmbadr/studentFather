const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
(async()=>{
  await c.connect();
  const r = await c.query("UPDATE teachers SET subject = ''");
  console.log('Cleared subject on ' + r.rowCount + ' teachers');
  await c.end();
})();
