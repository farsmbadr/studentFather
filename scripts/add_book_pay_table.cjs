const pg = require('pg');
(async () => {
  const c = new pg.Client({host:'localhost',port:5433,user:'postgres',password:'root',database:'baderp'});
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS book_delivery_payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      delivery_id uuid NOT NULL REFERENCES book_deliveries(id) ON DELETE CASCADE,
      student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      amount numeric NOT NULL DEFAULT 0,
      date date NOT NULL DEFAULT CURRENT_DATE,
      notes text DEFAULT '',
      created_at timestamptz DEFAULT now()
    )
  `);
  console.log('book_delivery_payments table created');
  await c.end();
})();
