import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js/dist/sql-asm.js';
import initSQL from './init-sql.js';
import os from 'os';

const app = express();
const PORT = 3001;
const JWT_SECRET = 'baderp-local-secret-key-2025';
const LICENSE_SECRET = '031eb8ac5c832a46b73da7c594dc502d401cb1062070347c80e1a8445043ad5c';
const IS_PKG = !!process.pkg;
const APP_DIR = IS_PKG
  ? path.dirname(process.execPath)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_DIR = path.join(APP_DIR, 'data');
const DB_PATH = path.join(DB_DIR, 'data.db');
const LICENSE_PATH = path.join(APP_DIR, 'license.json');
const BACKUP_DIRS = [
  'C:\\CenterMasrBackup',
  ...(() => { try { if (fs.existsSync('D:\\')) return ['D:\\CenterMasrBackup']; } catch {} return []; })(),
  path.join(APP_DIR, 'backups')
];

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── SQLite Init ───
let db;
async function initDB() {
  const SQL = await initSqlJs();
  fs.mkdirSync(DB_DIR, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA foreign_keys=ON');

  // Apply migrations from bundled JS module (works with pkg)
  try {
    db.run(initSQL);
    saveDB();
    console.log('Migrations applied');
  } catch (e) {
    console.log('Migrations skipped:', e.message);
  }

  // Seed default grades only if table is empty (so user deletions persist)
  try {
    const gradeCount = db.exec("SELECT COUNT(*) AS c FROM grades");
    if (gradeCount.length && gradeCount[0].values[0][0] === 0) {
      db.run(`INSERT OR IGNORE INTO grades (id, name, sort_order) VALUES
        ('g0000001-0000-0000-0000-000000000001', 'الصف الأول الابتدائي', 1),
        ('g0000002-0000-0000-0000-000000000002', 'الصف الثاني الابتدائي', 2),
        ('g0000003-0000-0000-0000-000000000003', 'الصف الثالث الابتدائي', 3),
        ('g0000004-0000-0000-0000-000000000004', 'الصف الرابع الابتدائي', 4),
        ('g0000005-0000-0000-0000-000000000005', 'الصف الخامس الابتدائي', 5),
        ('g0000006-0000-0000-0000-000000000006', 'الصف السادس الابتدائي', 6),
        ('g0000007-0000-0000-0000-000000000007', 'الصف الأول الإعدادي', 7),
        ('g0000008-0000-0000-0000-000000000008', 'الصف الثاني الإعدادي', 8),
        ('g0000009-0000-0000-0000-000000000009', 'الصف الثالث الإعدادي', 9),
        ('g000000a-0000-0000-0000-00000000000a', 'الصف الأول الثانوي', 10),
        ('g000000b-0000-0000-0000-00000000000b', 'الصف الثاني الثانوي', 11),
        ('g000000c-0000-0000-0000-00000000000c', 'الصف الثالث الثانوي', 12)`);
      saveDB();
      console.log('Default grades seeded');
    }
  } catch (e) {
    console.log('Grade seeding skipped:', e.message);
  }

  // Fix expenses table schema (rename name→title, add created_by)
  try {
    const cols = queryAll("PRAGMA table_info('expenses')").map(c => c.name);
    if (cols.includes('name') && !cols.includes('title')) {
      db.run("ALTER TABLE expenses RENAME COLUMN name TO title");
    }
    if (!cols.includes('created_by')) {
      db.run("ALTER TABLE expenses ADD COLUMN created_by TEXT DEFAULT ''");
    }
    saveDB();
  } catch (e) {
    console.log('Expenses migration:', e.message);
  }

  // Add parent_messages table if missing
  try {
    const tables = queryAll("SELECT name FROM sqlite_master WHERE type='table'").map(r => r.name);
    if (!tables.includes('parent_messages')) {
      db.run(`CREATE TABLE IF NOT EXISTS parent_messages (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL DEFAULT '',
        student_name TEXT DEFAULT '',
        student_code TEXT DEFAULT '',
        parent_name TEXT DEFAULT '',
        parent_phone TEXT NOT NULL DEFAULT '',
        message TEXT NOT NULL DEFAULT '',
        reply TEXT DEFAULT '',
        replied_at TEXT,
        replied_by TEXT DEFAULT '',
        is_read INTEGER NOT NULL DEFAULT 0,
        parent_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
      saveDB();
      console.log('Created parent_messages table');
    }
  } catch (e) {
    console.log('Parent messages migration:', e.message);
  }

  // Add missing columns to book_deliveries (paid_amount, remaining, delivery_type)
  try {
    const bdCols = queryAll("PRAGMA table_info('book_deliveries')").map(c => c.name);
    if (!bdCols.includes('paid_amount')) db.run("ALTER TABLE book_deliveries ADD COLUMN paid_amount REAL DEFAULT 0");
    if (!bdCols.includes('remaining')) db.run("ALTER TABLE book_deliveries ADD COLUMN remaining REAL DEFAULT 0");
    if (!bdCols.includes('delivery_type')) db.run("ALTER TABLE book_deliveries ADD COLUMN delivery_type TEXT DEFAULT 'بيع'");
    saveDB();
  } catch (e) {
    console.log('Book deliveries migration:', e.message);
  }

  // Add student_id to book_delivery_payments
  try {
    const bdpCols = queryAll("PRAGMA table_info('book_delivery_payments')").map(c => c.name);
    if (!bdpCols.includes('student_id')) db.run("ALTER TABLE book_delivery_payments ADD COLUMN student_id TEXT DEFAULT ''");
    saveDB();
  } catch (e) {
    console.log('Book delivery payments migration:', e.message);
  }

  // Add balance column to students
  try {
    const stuCols = queryAll("PRAGMA table_info('students')").map(c => c.name);
    if (!stuCols.includes('balance')) db.run("ALTER TABLE students ADD COLUMN balance REAL DEFAULT 0");
    saveDB();
  } catch (e) {
    console.log('Students balance migration:', e.message);
  }

  console.log('SQLite ready at', DB_PATH);
  // Auto-backup on every startup (safety net)
  try {
    doAutoBackup();
  } catch (e) {
    console.log('Startup backup skipped:', e.message);
  }
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// ─── Query Helpers ───
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDB();
}

// ─── Auth ───
function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try { req.user = jwt.verify(auth.split(' ')[1], JWT_SECRET); }
    catch { req.user = null; }
  }
  next();
}

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0';
  const user = queryOne('SELECT * FROM app_users WHERE username = ? AND password = ?', [username, password]);
  const success = !!user;
  run('INSERT INTO login_logs (id, username, action, ip_address, success) VALUES (?, ?, ?, ?, ?)',
    [crypto.randomUUID(), username || 'unknown', success ? 'تسجيل دخول' : 'تسجيل دخول', String(ip).split(',')[0].trim(), success ? 1 : 0]);
  if (!success) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ access_token: token, user: { id: user.id, email: user.username + '@baderp.local', user_metadata: { name: user.name, role: user.role, permissions: JSON.parse(user.permissions || '[]'), phone: user.phone || '', is_super_admin: !!user.is_super_admin } } });
});

app.post('/api/auth/parent-login', (req, res) => {
  const { code, parentPhone } = req.body;
  if (!code || !parentPhone) return res.status(400).json({ error: 'code and parentPhone required' });
  try {
    const student = queryOne('SELECT * FROM students WHERE code = ? AND parent_phone = ?', [code, parentPhone]);
    if (!student || student.deleted_at) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    const token = jwt.sign(
      { type: 'parent', studentId: student.id, studentCode: student.code, name: student.name, parentPhone },
      JWT_SECRET, { expiresIn: '24h' }
    );
    res.json({ access_token: token, student: { id: student.id, name: student.name, code: student.code, grade: student.grade, group_name: student.group_name, parent_name: student.parent_name, parent_phone: student.parent_phone } });
  } catch (err) { console.error('Parent login error:', err); res.status(500).json({ error: err.message }); }
});

function requireParentAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    if (payload.type !== 'parent') return res.status(403).json({ error: 'Not a parent token' });
    req.parent = payload;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

app.get('/api/parent/dashboard', requireParentAuth, (req, res) => {
  try {
    const sid = req.parent.studentId;
    const student = queryOne('SELECT id, name, code, grade, group_name, parent_name, parent_phone, phone, monthly_fee, status, join_date, address, notes FROM students WHERE id = ?', [sid]);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const payments = queryAll('SELECT * FROM payments WHERE student_id = ? ORDER BY date DESC LIMIT 20', [sid]);
    const exams = queryAll("SELECT * FROM exam_results WHERE student_id = ? ORDER BY date DESC", [sid]);
    const absence = queryAll("SELECT * FROM absence_records WHERE student_id = ? ORDER BY date DESC LIMIT 30", [sid]);
    const notes = queryAll("SELECT * FROM attendance_notes WHERE student_id = ? ORDER BY date DESC LIMIT 20", [sid]);
    const books = queryAll("SELECT * FROM book_deliveries WHERE student_id = ? ORDER BY delivery_date DESC LIMIT 20", [sid]);
    const statusEntries = queryAll("SELECT * FROM student_status WHERE student_code = ? ORDER BY date DESC LIMIT 10", [student.code]);
    const notifications = queryAll("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20");
    const totalPaid = queryOne("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE student_id = ?", [sid]);
    res.json({ student, payments, exams, absence, notes, books, statusEntries, notifications, totalPaid: totalPaid.total });
  } catch (err) { console.error('Parent dashboard error:', err); res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/student-login', (req, res) => {
  const { code, phone } = req.body;
  if (!code || !phone) return res.status(400).json({ error: 'code and phone required' });
  try {
    const student = queryOne('SELECT * FROM students WHERE code = ? AND phone = ?', [code, phone]);
    if (!student || student.deleted_at) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    const token = jwt.sign(
      { type: 'student', studentId: student.id, studentCode: student.code, name: student.name, phone },
      JWT_SECRET, { expiresIn: '24h' }
    );
    res.json({ access_token: token, student: { id: student.id, name: student.name, code: student.code, grade: student.grade, group_name: student.group_name, phone: student.phone } });
  } catch (err) { console.error('Student login error:', err); res.status(500).json({ error: err.message }); }
});

function requireStudentAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    if (payload.type !== 'student') return res.status(403).json({ error: 'Not a student token' });
    req.student = payload;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

app.get('/api/student/dashboard', requireStudentAuth, (req, res) => {
  try {
    const sid = req.student.studentId;
    const student = queryOne('SELECT id, name, code, grade, group_name, phone, monthly_fee, status, join_date, address, notes FROM students WHERE id = ?', [sid]);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const payments = queryAll('SELECT * FROM payments WHERE student_id = ? ORDER BY date DESC LIMIT 20', [sid]);
    const exams = queryAll("SELECT * FROM exam_results WHERE student_id = ? ORDER BY date DESC", [sid]);
    const absence = queryAll("SELECT * FROM absence_records WHERE student_id = ? ORDER BY date DESC LIMIT 30", [sid]);
    const notes = queryAll("SELECT * FROM attendance_notes WHERE student_id = ? ORDER BY date DESC LIMIT 20", [sid]);
    const books = queryAll("SELECT * FROM book_deliveries WHERE student_id = ? ORDER BY delivery_date DESC LIMIT 20", [sid]);
    const statusEntries = queryAll("SELECT * FROM student_status WHERE student_code = ? ORDER BY date DESC LIMIT 10", [student.code]);
    const notifications = queryAll("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20");
    const totalPaid = queryOne("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE student_id = ?", [sid]);
    res.json({ student, payments, exams, absence, notes, books, statusEntries, notifications, totalPaid: totalPaid.total });
  } catch (err) { console.error('Student dashboard error:', err); res.status(500).json({ error: err.message }); }
});

// ─── Parent Messages API ───

// Parent sends a message
app.post('/api/parent/messages', requireParentAuth, (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    const id = crypto.randomUUID();
    const student = queryOne('SELECT id, name, code, parent_name, parent_phone FROM students WHERE id = ?', [req.parent.studentId]);
    run(`INSERT INTO parent_messages (id, student_id, student_name, student_code, parent_name, parent_phone, message) VALUES (?,?,?,?,?,?,?)`,
      [id, req.parent.studentId, student?.name || '', student?.code || '', student?.parent_name || '', req.parent.parentPhone, message]);
    res.status(201).json({ id });
  } catch (err) { console.error('Parent message error:', err); res.status(500).json({ error: err.message }); }
});

// Parent gets their messages
app.get('/api/parent/messages', requireParentAuth, (req, res) => {
  try {
    const messages = queryAll('SELECT * FROM parent_messages WHERE student_id = ? ORDER BY created_at DESC', [req.parent.studentId]);
    // Mark as read by parent
    run("UPDATE parent_messages SET parent_read = 1 WHERE student_id = ? AND parent_read = 0", [req.parent.studentId]);
    res.json(messages);
  } catch (err) { console.error('Parent messages error:', err); res.status(500).json({ error: err.message }); }
});

// Admin gets all parent messages (uses generic CRUD for parent_messages)
// Admin replies
app.post('/api/parent-messages/:id/reply', optionalAuth, (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ error: 'Reply required' });
    const msg = queryOne('SELECT * FROM parent_messages WHERE id = ?', [req.params.id]);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    run("UPDATE parent_messages SET reply = ?, replied_at = datetime('now'), replied_by = ?, is_read = 1 WHERE id = ?",
      [reply, req.user?.name || req.user?.username || 'السنتر', req.params.id]);
    res.json(queryOne('SELECT * FROM parent_messages WHERE id = ?', [req.params.id]));
  } catch (err) { console.error('Reply error:', err); res.status(500).json({ error: err.message }); }
});

// Admin marks as read
app.patch('/api/parent-messages/:id/read', optionalAuth, (req, res) => {
  try {
    run("UPDATE parent_messages SET is_read = 1 WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error('Mark read error:', err); res.status(500).json({ error: err.message }); }
});

// ─── Generic CRUD ───
function crud(table, idColumn = 'id') {
  app.get(`/api/${table}`, optionalAuth, (req, res) => {
    try {
      const { order, limit, status } = req.query;
      let sql = `SELECT * FROM "${table}"`;
      const params = [];
      const conds = [];
      if (status) { conds.push('status = ?'); params.push(status); }
      if (conds.length > 0) sql += ' WHERE ' + conds.join(' AND ');
      if (order) {
        const parts = order.split('.');
        const col = parts[0], dir = parts.slice(1).join('.');
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) return res.status(400).json({ error: 'Invalid order column' });
        sql += ` ORDER BY "${col}" ${dir === 'asc' ? 'ASC' : 'DESC'}`;
      } else sql += ' ORDER BY created_at DESC';
      if (limit) { sql += ' LIMIT ?'; params.push(+limit); }
      res.json(queryAll(sql, params));
    } catch (err) { console.error('GET error:', err); res.status(500).json({ error: err.message }); }
  });

  app.get(`/api/${table}/:id`, optionalAuth, (req, res) => {
    try {
      const row = queryOne(`SELECT * FROM "${table}" WHERE "${idColumn}" = ?`, [req.params.id]);
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (err) { console.error('GET by ID error:', err); res.status(500).json({ error: err.message }); }
  });

  app.post(`/api/${table}`, optionalAuth, (req, res) => {
    try {
      const items = Array.isArray(req.body) ? req.body : [req.body];
      if (items.length === 0 || !items[0]) return res.status(400).json({ error: 'Empty body' });

      const results = [];
      for (const item of items) {
        if (!item.id) item.id = crypto.randomUUID();
        const keys = Object.keys(item);
        const vals = keys.map(k => {
          const v = item[k];
          if (v === null || v === undefined) return null;
          if (Array.isArray(v)) return JSON.stringify(v);
          if (typeof v === 'object') return JSON.stringify(v);
          return v;
        });
        const ph = keys.map(() => '?').join(',');
        const cols = keys.map(k => `"${k}"`).join(',');
        const sql = `INSERT INTO "${table}" (${cols}) VALUES (${ph})`;
        run(sql, vals);
        results.push(queryOne(`SELECT * FROM "${table}" WHERE "${idColumn}" = ?`, [item[idColumn]]));
      }
      res.status(201).json(items.length === 1 ? results[0] : results);
    } catch (err) { console.error('POST error:', err); res.status(500).json({ error: err.message }); }
  });

  app.patch(`/api/${table}/:id`, optionalAuth, (req, res) => {
    try {
      const keys = Object.keys(req.body);
      const vals = keys.map(k => {
        const v = req.body[k];
        if (v === null || v === undefined) return null;
        if (Array.isArray(v)) return JSON.stringify(v);
        if (typeof v === 'object') return JSON.stringify(v);
        return v;
      });
      const sets = keys.map(k => `"${k}" = ?`).join(', ');
      vals.push(req.params.id);
      run(`UPDATE "${table}" SET ${sets} WHERE "${idColumn}" = ?`, vals);
      res.json(queryOne(`SELECT * FROM "${table}" WHERE "${idColumn}" = ?`, [req.params.id]) || {});
    } catch (err) { console.error('PATCH error:', err); res.status(500).json({ error: err.message }); }
  });

  app.delete(`/api/${table}/:id`, optionalAuth, (req, res) => {
    try {
      run(`DELETE FROM "${table}" WHERE "${idColumn}" = ?`, [req.params.id]);
      res.status(204).send();
    } catch (err) { console.error('DELETE error:', err); res.status(500).json({ error: err.message }); }
  });
}

// ─── Register all tables ───
const ALL_TABLES = ['students','absence_records','payments','exam_results','attendance_notes','student_groups','exams','books','classes','teachers','subjects','subject_teachers','subject_students','group_subjects','groups','notifications','app_users','custom_roles','login_logs','center_config','student_status','questions','exam_questions','suppliers','supplier_transactions','book_deliveries','book_delivery_payments','expenses','grades','parent_messages'];

// app_users: exclude password from GET
app.get('/api/app_users', optionalAuth, (req, res) => {
  try {
    res.json(queryAll('SELECT id, name, username, role, status, phone, permissions, is_super_admin, created_at FROM app_users ORDER BY created_at DESC'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/app_users/:id', optionalAuth, (req, res) => {
  try {
    const row = queryOne('SELECT id, name, username, role, status, phone, permissions, is_super_admin, created_at FROM app_users WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

for (const t of ALL_TABLES) {
  if (t !== 'app_users') crud(t);
}
crud('app_users');

// ─── Backup / Restore / Wipe ───

function fetchAllData() {
  const data = {};
  for (const t of ALL_TABLES) {
    if (t === 'app_users') continue;
    try { data[t] = queryAll(`SELECT * FROM "${t}"`); }
    catch { data[t] = []; }
  }
  return data;
}

function saveToDirs(content, prefix) {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const fileName = `${prefix}-${ts}.json`;
  for (const dir of BACKUP_DIRS) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, fileName), content, 'utf8');
  }
  return fileName;
}

function cleanOldBackups(prefix) {
  for (const dir of BACKUP_DIRS) {
    try {
      const files = fs.readdirSync(dir).filter(f => f.startsWith(prefix) && f.endsWith('.json'));
      const now = Date.now();
      for (const f of files) {
        const fp = path.join(dir, f);
        try { const stat = fs.statSync(fp); if (now - stat.mtimeMs > 7 * 86400000) fs.unlinkSync(fp); } catch {}
      }
    } catch {}
  }
}

app.get('/api/backup', (req, res) => {
  try {
    const data = fetchAllData();
    delete data.app_users; // don't backup super admin accounts
    const content = JSON.stringify(data, null, 2);
    saveToDirs(content, 'manual');
    res.json(data);
  } catch (err) { console.error('Backup error:', err); res.status(500).json({ error: err.message }); }
});

function doAutoBackup() {
  try {
    const data = fetchAllData();
    const content = JSON.stringify(data, null, 2);
    const fileName = saveToDirs(content, 'auto');
    cleanOldBackups('auto');
    console.log(`Auto-backup: ${fileName}`);
  } catch (err) { console.error('Auto-backup failed:', err); }
}

app.post('/api/wipe', (req, res) => {
  if (req.body?.confirm !== true) return res.status(400).json({ error: 'يجب تأكيد العملية بإرسال confirm: true' });
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'الرجاء إدخال كلمة مرور المشرف العام' });
  const admin = queryOne('SELECT id FROM app_users WHERE password = ? AND is_super_admin = 1', [password]);
  if (!admin) return res.status(401).json({ error: 'كلمة مرور المشرف العام غير صحيحة' });
  db.run('PRAGMA foreign_keys=OFF');
  for (const t of ALL_TABLES) {
    if (t === 'app_users') continue;
    db.run(`DELETE FROM "${t}"`);
  }
  db.run('PRAGMA foreign_keys=ON');
  saveDB();
  res.json({ ok: true });
});

app.post('/api/restore', (req, res) => {
  if (req.body?.confirm !== true) return res.status(400).json({ error: 'يجب تأكيد العملية بإرسال confirm: true' });
  const data = req.body.data;
  if (!data) return res.status(400).json({ error: 'Missing data field' });
  try {
    // Save super admin accounts before restore
    const superAdmins = queryAll('SELECT * FROM app_users WHERE is_super_admin = 1');
    db.run('PRAGMA foreign_keys=OFF');
    for (const t of [...ALL_TABLES].reverse()) db.run(`DELETE FROM "${t}"`);
    delete data.app_users; // skip user accounts from backup
    for (const t of ALL_TABLES) {
      let rows = data[t];
      if (!rows) continue;
      if (!Array.isArray(rows)) rows = [rows];
      if (rows.length === 0) continue;
      // Get actual columns in this SQLite table (skip unknown columns from old backups)
      const tableCols = queryAll(`PRAGMA table_info("${t}")`).map(c => c.name);
      const colSet = new Set(tableCols);
      for (const row of rows) {
        const keys = Object.keys(row).filter(k => colSet.has(k));
        if (keys.length === 0) continue;
        const vals = keys.map(k => {
          const v = row[k];
          if (typeof v === 'object' && v !== null) return JSON.stringify(v);
          return v;
        });
        const ph = keys.map(() => '?').join(',');
        const cols = keys.map(k => `"${k}"`).join(',');
        db.run(`INSERT INTO "${t}" (${cols}) VALUES (${ph})`, vals);
      }
    }
    // Re-insert super admin accounts
    for (const admin of superAdmins) {
      const keys = Object.keys(admin);
      const vals = keys.map(k => {
        const v = admin[k];
        if (typeof v === 'object' && v !== null) return JSON.stringify(v);
        return v;
      });
      const ph = keys.map(() => '?').join(',');
      const cols = keys.map(k => `"${k}"`).join(',');
      db.run(`INSERT OR REPLACE INTO app_users (${cols}) VALUES (${ph})`, vals);
    }
    db.run('PRAGMA foreign_keys=ON');
    saveDB();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Machine ID & License ───
app.get('/api/machine-id', (req, res) => {
  try {
    res.json({ machineId: getMachineIdSync() });
  } catch { res.json({ machineId: 'UNKNOWN' }); }
});

function getMachineIdSync() {
  const raw = `${os.hostname()}-${os.platform()}-${os.arch()}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function signLicense(obj) {
  const payload = JSON.stringify({ machine_id: obj.machine_id, activated_at: obj.activated_at, expires_at: obj.expires_at });
  const sig = crypto.createHmac('sha256', LICENSE_SECRET).update(payload).digest('hex');
  return { ...obj, sig };
}
function verifyLicense(obj) {
  if (!obj.sig) return false;
  const { sig, ...rest } = obj;
  const expected = crypto.createHmac('sha256', LICENSE_SECRET).update(JSON.stringify(rest)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

app.post('/api/activate-license', (req, res) => {
  try {
    const { machine_id, activated_at, expires_at } = req.body;
    if (!machine_id || !expires_at) return res.status(400).json({ error: 'بيانات الترخيص ناقصة' });
    const currentMachineId = getMachineIdSync();
    if (machine_id !== currentMachineId) return res.status(400).json({ error: 'هذا الترخيص لجهاز آخر' });
    const license = signLicense({ machine_id, activated_at: activated_at || new Date().toISOString(), expires_at });
    fs.mkdirSync('C:\\ProgramData\\CenterMasr', { recursive: true });
    fs.writeFileSync(LICENSE_PATH, JSON.stringify(license, null, 2));
    res.json({ ...license, valid: new Date(expires_at) > new Date(), currentMachineId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/check-license', (req, res) => {
  try {
    const currentMachineId = getMachineIdSync();
    let license;
    if (fs.existsSync(LICENSE_PATH)) {
      license = JSON.parse(fs.readFileSync(LICENSE_PATH, 'utf8'));
      if (!verifyLicense(license)) return res.json({ valid: false, error: 'الترخيص غير صالح (توقيع غير صحيح)', currentMachineId });
    } else {
      const now = new Date();
      const expires = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      license = signLicense({ machine_id: currentMachineId, activated_at: now.toISOString(), expires_at: expires.toISOString() });
      fs.mkdirSync('C:\\ProgramData\\CenterMasr', { recursive: true });
      fs.writeFileSync(LICENSE_PATH, JSON.stringify(license, null, 2));
    }
    const valid = license.machine_id === currentMachineId && new Date(license.expires_at) > new Date();
    res.json({ ...license, valid, currentMachineId });
  } catch (err) { res.json({ valid: false, error: err.message }); }
});

// ─── Password reset ───
app.post('/api/reset-password', (req, res) => {
  try {
    const { userId, requestedBy } = req.body;
    const admin = queryOne('SELECT id FROM app_users WHERE id = ? AND is_super_admin = 1', [requestedBy]);
    if (!admin) return res.status(403).json({ error: 'غير مصرح' });
    const u = queryOne('SELECT phone FROM app_users WHERE id = ?', [userId]);
    if (!u) return res.status(404).json({ error: 'المستخدم غير موجود' });
    const phone = u.phone || '0000';
    const newPassword = phone.slice(-4);
    run('UPDATE app_users SET password = ? WHERE id = ?', [newPassword, userId]);
    res.json({ ok: true, newPassword });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/change-password', (req, res) => {
  try {
    const { userId, currentPassword, newPassword, skipCurrentPassword } = req.body;
    if (!skipCurrentPassword) {
      const r = queryOne('SELECT id FROM app_users WHERE id = ? AND password = ?', [userId, currentPassword]);
      if (!r) return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    }
    run('UPDATE app_users SET password = ? WHERE id = ?', [newPassword, userId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Supabase Sync (Cloud Portal) ───

const SUPABASE_CONFIG_PATH = path.join(APP_DIR, 'supabase-config.json');
const PORTAL_TABLES = ['students', 'payments', 'exam_results', 'absence_records', 'attendance_notes', 'book_deliveries', 'student_status', 'notifications', 'parent_messages', 'subjects', 'exams', 'questions', 'exam_questions'];

// Save Supabase configuration
app.post('/api/sync-config', (req, res) => {
  try {
    const { url, anonKey, serviceRoleKey, portalUrl } = req.body;
    if (!url || !anonKey) return res.status(400).json({ error: 'URL و Anon Key مطلوبان' });
    fs.writeFileSync(SUPABASE_CONFIG_PATH, JSON.stringify({ url, anonKey, serviceRoleKey: serviceRoleKey || '', portalUrl: portalUrl || '' }, null, 2));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Supabase configuration
app.get('/api/sync-config', (req, res) => {
  try {
    if (!fs.existsSync(SUPABASE_CONFIG_PATH)) return res.json({ configured: false });
    const config = JSON.parse(fs.readFileSync(SUPABASE_CONFIG_PATH, 'utf8'));
    res.json({ configured: true, ...config });
  } catch { res.json({ configured: false }); }
});

// Get portal URL (for exam link generation)
app.get('/api/portal-url', (req, res) => {
  try {
    if (fs.existsSync(SUPABASE_CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(SUPABASE_CONFIG_PATH, 'utf8'));
      if (config.portalUrl) return res.json({ url: config.portalUrl });
    }
    res.json({ url: '' });
  } catch { res.json({ url: '' }); }
});

// Sync portal data to Supabase
app.post('/api/sync-to-supabase', async (req, res) => {
  try {
    if (!fs.existsSync(SUPABASE_CONFIG_PATH)) return res.status(400).json({ error: 'لم يتم تكوين Supabase بعد. أدخل الرابط والمفتاح أولاً.' });
    const config = JSON.parse(fs.readFileSync(SUPABASE_CONFIG_PATH, 'utf8'));
    const { url, anonKey, serviceRoleKey } = config;
    const key = serviceRoleKey || anonKey;
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(url, key);

    const results = {};
    for (const table of PORTAL_TABLES) {
      const rows = queryAll(`SELECT * FROM "${table}"`);
      if (rows.length === 0) { results[table] = { count: 0, status: 'ok' }; continue; }
      // Upsert — keeps data from all centers, no deletion
      const { error: upsertErr } = await supabase.from(table).upsert(rows, { onConflict: 'id', ignoreDuplicates: false });
      if (upsertErr) { results[table] = { count: 0, status: 'error', error: upsertErr.message }; }
      else { results[table] = { count: rows.length, status: 'ok' }; }
    }
    res.json({ ok: true, results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Serve frontend (Express 5+ compatible) ───
const distPath = path.join(APP_DIR, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
    next();
  });
  console.log('Serving frontend from', distPath);
}

// ─── Start ───
async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`CenterMasr server on http://localhost:${PORT}`);
    setTimeout(() => { doAutoBackup(); setInterval(doAutoBackup, 86400000); }, 30000);
  });
}
start();
