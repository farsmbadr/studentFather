const { Client } = require('pg');
(async () => {
  const c = new Client({ host:'localhost',port:5433,user:'postgres',password:'root',database:'baderp' });
  await c.connect();
  // Delete test payment
  await c.query("DELETE FROM payments WHERE student_id='511b4b55-e0de-4bde-ba8e-7ee8130e8b92' AND received_by='admin' AND notes=''");
  console.log('Test payment cleaned');
  await c.end();
})();
