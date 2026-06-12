/*
  export-from-pg.js
  Reads data from PostgreSQL and exports as JSON backup
  The backup can be imported via Settings > Restore in the Tauri app
  Usage: node scripts/export-from-pg.js > backup.json
*/

const { Client } = require('pg');

const ALL_TABLES = [
  'students','absence_records','payments','exam_results','attendance_notes',
  'student_groups','exams','books','classes','teachers','subjects',
  'subject_teachers','subject_students','group_subjects','groups',
  'notifications','app_users','custom_roles','login_logs','center_config',
  'student_status','questions','exam_questions','suppliers',
  'supplier_transactions','book_deliveries','book_delivery_payments','expenses','grades',
];

async function main() {
  const pg = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
  await pg.connect();

  const data = {};
  for (const table of ALL_TABLES) {
    const { rows } = await pg.query(`SELECT * FROM ${table}`);
    data[table] = rows.map(r => {
      const obj = {};
      for (const [k, v] of Object.entries(r)) {
        if (v instanceof Date) {
          obj[k] = v.toISOString().slice(0, 19).replace('T', ' ');
        } else if (typeof v === 'object' && v !== null) {
          obj[k] = JSON.stringify(v);
        } else {
          obj[k] = v;
        }
      }
      return obj;
    });
  }

  process.stdout.write(JSON.stringify({ tables: data }, null, 2));
  await pg.end();
}

main().catch(e => { console.error('Export failed:', e); process.exit(1); });
