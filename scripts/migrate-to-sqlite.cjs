/*
  migrate-to-sqlite.cjs
  Reads data from PostgreSQL and writes it to SQLite
  Usage: node migrate-to-sqlite.cjs
  Requires: npm install pg better-sqlite3
*/

const { Client } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const SQLITE_PATH = path.join(process.env.APPDATA || 'C:\\ProgramData', 'CenterMasr', 'data.db');

const ALL_TABLES = [
  'students','absence_records','payments','exam_results','attendance_notes',
  'student_groups','exams','books','classes','teachers','subjects',
  'subject_teachers','subject_students','group_subjects','groups',
  'notifications','app_users','custom_roles','login_logs','center_config',
  'student_status','questions','exam_questions','suppliers',
  'supplier_transactions','book_deliveries','book_delivery_payments','expenses','grades',
];

async function main() {
  console.log('Connecting to PostgreSQL...');
  const pg = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
  await pg.connect();

  console.log('Opening SQLite...');
  fs.mkdirSync(path.dirname(SQLITE_PATH), { recursive: true });
  const sqlite = new Database(SQLITE_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = OFF');

  console.log('Running SQLite migrations...');
  const migrationSQL = fs.readFileSync(path.join(__dirname, '..', 'src-tauri', 'migrations', '20240612000001_init.sql'), 'utf8');
  sqlite.exec(migrationSQL);

  for (const table of ALL_TABLES) {
    console.log(`Migrating ${table}...`);
    const { rows } = await pg.query(`SELECT * FROM ${table}`);
    if (rows.length === 0) { console.log(`  -> empty`); continue; }

    const cols = Object.keys(rows[0]);
    const placeholders = cols.map(() => '?').join(',');

    const insert = sqlite.prepare(
      `INSERT OR REPLACE INTO "${table}" (${cols.map(c => `"${c}"`).join(',')}) VALUES (${placeholders})`
    );

    const insertMany = sqlite.transaction((batch) => {
      for (const row of batch) {
        const vals = cols.map(c => {
          const v = row[c];
          if (v === null || v === undefined) return null;
          if (typeof v === 'object') return JSON.stringify(v); // jsonb -> text
          return v;
        });
        insert.run(...vals);
      }
    });

    insertMany(rows);
    console.log(`  -> ${rows.length} rows`);
  }

  sqlite.pragma('foreign_keys = ON');
  sqlite.close();
  await pg.end();

  console.log(`\nDone! SQLite database at: ${SQLITE_PATH}`);
}

main().catch(e => { console.error('Migration failed:', e); process.exit(1); });
