const { Client } = require('pg');
(async () => {
  const c = new Client({host:'localhost',port:5433,user:'postgres',password:'root',database:'baderp'});
  await c.connect();
  await c.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '[]'::jsonb`);
  // Set all permissions for existing users
  await c.query(`UPDATE app_users SET permissions = '["all"]'::jsonb WHERE permissions = '[]'::jsonb OR permissions IS NULL`);
  console.log('app_users.permissions column added');
  await c.end();
})();
