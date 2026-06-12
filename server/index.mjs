import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const app = express();
const PORT = 3001;
const JWT_SECRET = 'baderp-local-secret-key-2025';
const LICENSE_SECRET = '031eb8ac5c832a46b73da7c594dc502d401cb1062070347c80e1a8445043ad5c';

const db = new pg.Pool({ host: 'localhost', port: 5433, user: 'postgres', password: 'root', database: 'baderp', max: 10 });
console.log('DB connected');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Simple auth for local use
function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try { req.user = jwt.verify(auth.split(' ')[1], JWT_SECRET); }
    catch { req.user = null; }
  }
  next();
}

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0';
  const r = await db.query('SELECT * FROM app_users WHERE username = $1 AND password = $2', [username, password]);
  const success = r.rows.length > 0;
  if (!success) {
    await db.query('INSERT INTO login_logs (username, action, ip_address, success) VALUES ($1, $2, $3, $4)', [username || 'unknown', 'تسجيل دخول', String(ip).split(',')[0].trim(), false]);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const user = r.rows[0];
  await db.query('INSERT INTO login_logs (username, action, ip_address, success) VALUES ($1, $2, $3, $4)', [user.username, 'تسجيل دخول', String(ip).split(',')[0].trim(), true]);
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ access_token: token, user: { id: user.id, email: user.username + '@baderp.local', user_metadata: { name: user.name, role: user.role, permissions: user.permissions || [], phone: user.phone || '', must_change_password: user.must_change_password || false, is_super_admin: user.is_super_admin || false } } });
});

// Column type cache for proper value formatting
let colTypesCache = null;
async function ensureColTypes() {
  if (colTypesCache) return;
  colTypesCache = {};
  const ci = await db.query("SELECT table_name, column_name, udt_name FROM information_schema.columns WHERE table_schema = 'public'");
  for (const c of ci.rows) {
    if (!colTypesCache[c.table_name]) colTypesCache[c.table_name] = {};
    colTypesCache[c.table_name][c.column_name] = c.udt_name;
  }
}
function fmtValForCol(tbl, col, val) {
  const t = colTypesCache?.[tbl]?.[col];
  if (t === 'jsonb') return JSON.stringify(val);
  if (t && t.startsWith('_')) return val; // text[] or other array types
  if (Array.isArray(val)) return JSON.stringify(val);
  if (typeof val === 'object' && val !== null) return JSON.stringify(val);
  return val;
}
// Generic CRUD helper - no auth required for local
function crud(table, idColumn = 'id') {
  app.get(`/api/${table}`, optionalAuth, async (req, res) => {
    try {
      const { order, limit, status } = req.query;
      let sql = `SELECT * FROM ${table}`;
      const params = [];
      const conds = [];
      if (status) { conds.push(`status = $${params.length + 1}`); params.push(status); }
      if (conds.length > 0) sql += ' WHERE ' + conds.join(' AND ');
      if (order) {
        const parts = order.split('.');
        const col = parts[0], dir = parts.slice(1).join('.');
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) return res.status(400).json({ error: 'Invalid order column' });
        sql += ` ORDER BY ${col} ${dir === 'asc' ? 'ASC' : 'DESC'}`;
      } else sql += ' ORDER BY created_at DESC';
      if (limit) { sql += ` LIMIT $${params.length + 1}`; params.push(+limit); }
      const r = await db.query(sql, params);
      res.json(r.rows);
    } catch (err) { console.error('GET error:', err); res.status(500).json({ error: err.message }); }
  });
  app.get(`/api/${table}/:id`, optionalAuth, async (req, res) => {
    try {
      const r = await db.query(`SELECT * FROM ${table} WHERE ${idColumn} = $1`, [req.params.id]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(r.rows[0]);
    } catch (err) { console.error('GET by ID error:', err); res.status(500).json({ error: err.message }); }
  });
  app.post(`/api/${table}`, optionalAuth, async (req, res) => {
    try {
      await ensureColTypes();
      const items = Array.isArray(req.body) ? req.body : [req.body];
      if (items.length === 0 || !items[0]) return res.status(400).json({ error: 'Empty body' });
      const keys = Object.keys(items[0]);
      const allVals = [];
      const placeholders = [];
      let idx = 1;
      for (const item of items) {
        const rowVals = keys.map(k => fmtValForCol(table, k, item[k]));
        allVals.push(...rowVals);
        placeholders.push('(' + keys.map((_, i) => '$' + (idx++)) + ')');
      }
      const cols = keys.join(', ');
      const r = await db.query(`INSERT INTO ${table} (${cols}) VALUES ${placeholders.join(', ')} RETURNING *`, allVals);
      res.status(201).json(items.length === 1 ? r.rows[0] : r.rows);
    } catch (err) { console.error('POST error:', err); res.status(500).json({ error: err.message }); }
  });
  app.patch(`/api/${table}/:id`, optionalAuth, async (req, res) => {
    try {
      await ensureColTypes();
      const keys = Object.keys(req.body);
      const vals = keys.map(k => fmtValForCol(table, k, req.body[k]));
      const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      vals.push(req.params.id);
      const r = await db.query(`UPDATE ${table} SET ${sets} WHERE ${idColumn} = $${keys.length + 1} RETURNING *`, vals);
      res.json(r.rows[0] || {});
    } catch (err) { console.error('PATCH error:', err); res.status(500).json({ error: err.message }); }
  });
  app.delete(`/api/${table}/:id`, optionalAuth, async (req, res) => {
    try {
      await db.query(`DELETE FROM ${table} WHERE ${idColumn} = $1`, [req.params.id]);
      res.status(204).send();
    } catch (err) { console.error('DELETE error:', err); res.status(500).json({ error: err.message }); }
  });
}

crud('students');
crud('absence_records');
crud('payments');
crud('exam_results');
crud('attendance_notes');
crud('student_groups');
crud('exams');
crud('books');
crud('classes');
crud('teachers');
crud('subjects');
crud('subject_teachers');
crud('subject_students');
crud('group_subjects');
crud('groups');
crud('notifications');
// Custom handler for app_users — exclude password from GET responses
app.get('/api/app_users', optionalAuth, async (req, res) => {
  try {
    const r = await db.query('SELECT id, name, username, role, status, phone, must_change_password, permissions, is_super_admin, created_at FROM app_users ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/app_users/:id', optionalAuth, async (req, res) => {
  try {
    const r = await db.query('SELECT id, name, username, role, status, phone, must_change_password, permissions, is_super_admin, created_at FROM app_users WHERE id = $1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
crud('app_users');
crud('custom_roles');
crud('login_logs');
crud('center_config');
crud('student_status');
crud('questions');
crud('exam_questions');
crud('suppliers');
crud('supplier_transactions');
crud('book_deliveries');
crud('book_delivery_payments');
crud('expenses');
crud('grades');

// ── Backup / Restore / Wipe ──
const ALL_TABLES = ['students','absence_records','payments','exam_results','attendance_notes','student_groups','exams','books','classes','teachers','subjects','subject_teachers','subject_students','group_subjects','groups','notifications','app_users','custom_roles','login_logs','center_config','student_status','questions','exam_questions','suppliers','supplier_transactions','book_deliveries','book_delivery_payments','expenses','grades'];
const VALID_COL = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const VALID_TABLE = /^[a-zA-Z_]+$/;

function requireConfirm(req, res) {
  if (req.body?.confirm !== true) {
    res.status(400).json({ error: 'يجب تأكيد العملية بإرسال confirm: true' });
    return false;
  }
  return true;
}

function isValidColumnName(k) { return VALID_COL.test(k); }

// ── Shared helpers ──
const BACKUP_DIRS = ['C:\\CenterMasrBackup'];
try { if (fs.existsSync('D:\\')) BACKUP_DIRS.push('D:\\CenterMasrBackup'); } catch {}

async function fetchAllData() {
  const data = {};
  for (const t of ALL_TABLES) { const r = await db.query(`SELECT * FROM ${t}`); data[t] = r.rows; }
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

app.get('/api/backup', async (req, res) => {
  try {
    const data = await fetchAllData();
    const content = JSON.stringify(data, null, 2);
    const fileName = saveToDirs(content, 'manual');
    res.json(data);
    console.log(`Manual backup saved: ${fileName}`);
  } catch (err) { console.error('Backup error:', err); res.status(500).json({ error: err.message }); }
});

// ── Auto daily backup ──
async function doAutoBackup() {
  try {
    const data = await fetchAllData();
    const content = JSON.stringify(data, null, 2);
    const fileName = saveToDirs(content, 'auto');
    cleanOldBackups('auto');
    console.log(`Auto-backup completed: ${fileName}`);
  } catch (err) { console.error('Auto-backup failed:', err); }
}
// First backup after 30s, then every 24h
setTimeout(() => { doAutoBackup(); setInterval(doAutoBackup, 86400000); }, 30000);

app.post('/api/wipe', async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'الرجاء إدخال كلمة مرور المشرف العام' });
  const admin = await db.query('SELECT id FROM app_users WHERE password = $1 AND is_super_admin = true', [password]);
  if (admin.rows.length === 0) return res.status(401).json({ error: 'كلمة مرور المشرف العام غير صحيحة' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const t of ALL_TABLES) {
      if (t === 'app_users') continue;
      await client.query(`DELETE FROM ${t}`);
    }
    await client.query('COMMIT');
    console.log('Wipe completed successfully');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Wipe failed, rolled back:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/api/restore', async (req, res) => {
  if (!requireConfirm(req, res)) return;
  const data = req.body.data;
  if (!data) return res.status(400).json({ error: 'Missing data field' });
  const client = await db.connect();
  try {
    await ensureColTypes();
    await client.query('BEGIN');
    await client.query("SET session_replication_role = replica;");
    // Wipe phase
    for (const t of [...ALL_TABLES].reverse()) {
      if (!VALID_TABLE.test(t)) { throw new Error('Invalid table name: ' + t); }
      await client.query(`DELETE FROM ${t}`);
    }
    // Restore phase
    for (const t of ALL_TABLES) {
      if (!VALID_TABLE.test(t)) { throw new Error('Invalid table name: ' + t); }
      const rows = data[t];
      if (!rows || rows.length === 0) continue;
      for (const row of rows) {
        const keys = Object.keys(row);
        for (const k of keys) {
          if (!isValidColumnName(k)) throw new Error('Invalid column name: ' + JSON.stringify(k));
        }
        const vals = keys.map(k => fmtValForCol(t, k, row[k]));
        const ph = keys.map((_, i) => '$' + (i + 1)).join(', ');
        const cols = keys.join(', ');
        await client.query(`INSERT INTO ${t} (${cols}) VALUES (${ph})`, vals);
      }
    }
    await client.query("SET session_replication_role = DEFAULT;");
    await client.query('COMMIT');
    console.log('Restore completed successfully');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Restore failed, rolled back:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/machine-id', (req, res) => {
  try {
    const uuid = execSync('wmic csproduct get uuid', { encoding: 'utf8', timeout: 5000 });
    const lines = uuid.split('\n').map(l => l.trim()).filter(Boolean);
    const id = lines.length > 1 ? lines[1] : 'UNKNOWN';
    // Hash it for privacy
    const hash = execSync(`powershell -Command "& {[System.BitConverter]::ToString((New-Object Security.Cryptography.SHA256Managed).ComputeHash([Text.Encoding]::UTF8.GetBytes('${id.trim()}'))).Replace('-','').ToLower()}"`, { encoding: 'utf8', timeout: 5000 }).trim();
    res.json({ machineId: hash || id.trim() });
  } catch { res.json({ machineId: 'UNKNOWN' }); }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const { userId, requestedBy } = req.body;
    // Only super admin can reset
    const admin = await db.query('SELECT id FROM app_users WHERE id = $1 AND is_super_admin = true', [requestedBy]);
    if (admin.rows.length === 0) return res.status(403).json({ error: 'غير مصرح' });
    // Get user's phone
    const u = await db.query('SELECT phone FROM app_users WHERE id = $1', [userId]);
    if (u.rows.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });
    const phone = u.rows[0].phone || '0000';
    const newPassword = phone.slice(-4);
    await db.query('UPDATE app_users SET password = $1, must_change_password = true WHERE id = $2', [newPassword, userId]);
    res.json({ ok: true, newPassword });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword, skipCurrentPassword } = req.body;
    if (!skipCurrentPassword) {
      const r = await db.query('SELECT id FROM app_users WHERE id = $1 AND password = $2', [userId, currentPassword]);
      if (r.rows.length === 0) return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    }
    await db.query('UPDATE app_users SET password = $1, must_change_password = false WHERE id = $2', [newPassword, userId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── License / 14-day trial ──
const LICENSE_PATH = 'C:\\ProgramData\\CenterMasr\\license.json';

function getMachineIdSync() {
  try {
    const uuid = execSync('wmic csproduct get uuid', { encoding: 'utf8', timeout: 5000 });
    const lines = uuid.split('\n').map(l => l.trim()).filter(Boolean);
    const id = lines.length > 1 ? lines[1] : 'UNKNOWN';
    const hash = execSync(`powershell -Command "& {[System.BitConverter]::ToString((New-Object Security.Cryptography.SHA256Managed).ComputeHash([Text.Encoding]::UTF8.GetBytes('${id.trim()}'))).Replace('-','').ToLower()}"`, { encoding: 'utf8', timeout: 5000 }).trim();
    return hash || id.trim();
  } catch { return 'UNKNOWN'; }
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
    const valid = new Date(expires_at) > new Date();
    res.json({ ...license, valid, currentMachineId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/check-license', (req, res) => {
  try {
    const currentMachineId = getMachineIdSync();
    let license;
    if (fs.existsSync(LICENSE_PATH)) {
      license = JSON.parse(fs.readFileSync(LICENSE_PATH, 'utf8'));
      if (!verifyLicense(license)) {
        return res.json({ valid: false, error: 'الترخيص غير صالح (توقيع غير صحيح)', currentMachineId });
      }
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

app.listen(PORT, () => console.log(`API server on http://localhost:${PORT}`));
