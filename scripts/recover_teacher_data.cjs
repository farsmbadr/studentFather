const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp' });
(async() => {
  await c.connect();
  // Fix teachers that have '1' in group_names
  await c.query("UPDATE teachers SET group_names = '{}' WHERE group_names = '{1}'");
  // For أ. أحمد فتحي: extract subjects from text column and split
  await c.query("UPDATE teachers SET subjects = string_to_array(subject, '، ') WHERE subject != '' AND (subjects IS NULL OR array_length(subjects,1) IS NULL OR array_length(subjects,1) = 0)");
  // Fix أ. كريم محمد: his subject text is "التاريخ (ثانوي)"
  await c.query("UPDATE teachers SET subjects = string_to_array(subject, '، ') WHERE name = 'أ. كريم محمد' AND subject = 'التاريخ (ثانوي)'");
  const r = await c.query("SELECT name, subject, subjects, group_names FROM teachers ORDER BY created_at DESC");
  console.log('=== After recovery ===');
  for (const row of r.rows) console.log(`${row.name} | subj=${row.subject} | subs=${JSON.stringify(row.subjects)} | grps=${JSON.stringify(row.group_names)}`);
  await c.end();
})();
