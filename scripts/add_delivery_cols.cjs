const pg = require('pg');
(async () => {
  const c = new pg.Client({host:'localhost',port:5433,user:'postgres',password:'root',database:'baderp'});
  await c.connect();
  await c.query("ALTER TABLE students ADD COLUMN IF NOT EXISTS balance numeric NOT NULL DEFAULT 0");
  console.log('students.balance added');
  await c.query("ALTER TABLE book_deliveries ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0");
  console.log('book_deliveries.paid_amount added');
  await c.query("ALTER TABLE book_deliveries ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'بيع'");
  console.log('book_deliveries.delivery_type added');
  await c.query("ALTER TABLE book_deliveries ADD COLUMN IF NOT EXISTS remaining numeric NOT NULL DEFAULT 0");
  console.log('book_deliveries.remaining added');
  await c.end();
})();
