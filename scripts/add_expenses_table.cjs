const pg = require('pg');
(async () => {
  const c = new pg.Client({host:'localhost',port:5433,user:'postgres',password:'root',database:'baderp'});
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL DEFAULT '',
      amount numeric(10,2) NOT NULL DEFAULT 0,
      category text NOT NULL DEFAULT 'أخرى',
      date date NOT NULL DEFAULT CURRENT_DATE,
      notes text DEFAULT '',
      is_archived boolean NOT NULL DEFAULT false,
      created_at timestamptz DEFAULT now()
    )
  `);
  console.log('expenses table created');
  await c.end();
})();
