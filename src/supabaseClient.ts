// Tauri-aware Local API client - uses Tauri invoke when running in Tauri, fetch otherwise

const API = '/api';

// Detect Tauri runtime
const isTauri = typeof window !== 'undefined' && typeof (window as any).__TAURI_INTERNALS__ !== 'undefined';

let invoke: (cmd: string, args?: any) => Promise<any>;
if (isTauri) {
  // Dynamic import — only resolved at runtime inside Tauri
  invoke = (cmd, args) =>
    import('@tauri-apps/api/core').then(m => m.invoke(cmd, args || {}));
}

function headers() {
  return { 'Content-Type': 'application/json' };
}

function tableName(alias: string): string {
  const map: Record<string, string> = {
    absence_records: 'absence_records',
    books: 'books',
    classes: 'classes',
    exams: 'exams',
    groups: 'groups',
    notifications: 'notifications',
    students: 'students',
    payments: 'payments',
    exam_results: 'exam_results',
    attendance_notes: 'attendance_notes',
    student_groups: 'student_groups',
    app_users: 'app_users',
    login_logs: 'login_logs',
    center_config: 'center_config',
    student_status: 'student_status',
    teachers: 'teachers',
    subjects: 'subjects',
    subject_teachers: 'subject_teachers',
    subject_students: 'subject_students',
    group_subjects: 'group_subjects',
    questions: 'questions',
    exam_questions: 'exam_questions',
    suppliers: 'suppliers',
    supplier_transactions: 'supplier_transactions',
    book_deliveries: 'book_deliveries',
    book_delivery_payments: 'book_delivery_payments',
    expenses: 'expenses',
    custom_roles: 'custom_roles',
    grades: 'grades',
  };
  return map[alias] || alias;
}

// Query builder mimicking Supabase API
class QueryBuilder {
  private table: string;
  private filters: Array<{ col: string; val: string }> = [];
  private orderCol = '';
  private orderAsc = false;
  private limitVal = 0;
  private maybeVal = false;
  private countVal = false;

  constructor(table: string) { this.table = table; }

  select(_: string, opts?: { count?: 'exact'; head?: boolean }) {
    this.countVal = !!opts?.count;
    return this;
  }

  eq(col: string, val: string) { this.filters.push({ col, val }); return this; }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending ?? false;
    return this;
  }

  limit(n: number) { this.limitVal = n; return this; }

  maybeSingle() { this.maybeVal = true; return this; }

  async then(resolve: (val: any) => any, reject?: (err: any) => any) {
    try {
      const tn = tableName(this.table);
      let sql = `SELECT * FROM "${tn}"`;
      const where: string[] = [];
      const params: any[] = [];

      for (const f of this.filters) {
        where.push(`"${f.col}" = ?`);
        params.push(f.val);
      }
      if (where.length) sql += ' WHERE ' + where.join(' AND ');
      if (this.orderCol) sql += ` ORDER BY "${this.orderCol}" ${this.orderAsc ? 'ASC' : 'DESC'}`;
      if (this.limitVal) sql += ` LIMIT ${this.limitVal}`;

      if (this.countVal) {
        resolve({ data: null, count: 0, error: null });
        return;
      }

      let data: any[];

      if (isTauri && invoke) {
        const result = await invoke('db_query', { sql, params });
        data = result.rows.map((row: any[]) => {
          const obj: any = {};
          result.columns.forEach((col: string, i: number) => {
            obj[col] = row[i];
          });
          return obj;
        });
      } else {
        const qs = new URLSearchParams();
        if (this.orderCol) qs.set('order', `${this.orderCol}.${this.orderAsc ? 'asc' : 'desc'}`);
        if (this.limitVal) qs.set('limit', String(this.limitVal));
        const statusFilter = this.filters.find(f => f.col === 'status');
        if (statusFilter) qs.set('status', statusFilter.val);

        const url = `${API}/${tn}${qs.toString() ? '?' + qs : ''}`;
        const res = await fetch(url, { headers: headers() });

        if (res.status === 404) { resolve({ data: null, error: null }); return; }

        data = await res.json();

        for (const f of this.filters) {
          if (f.col !== 'status') {
            data = data.filter((r: any) => String(r[f.col]) === f.val);
          }
        }
      }

      if (this.maybeVal) { resolve({ data: data[0] || null, error: null }); return; }
      resolve({ data, error: null });
    } catch (err: any) {
      if (reject) reject(err);
      else resolve({ data: null, error: err });
    }
  }

  catch(reject: (err: any) => any) { return this.then((v: any) => v, reject); }
}

class InsertBuilder {
  private table: string;
  private data: any;

  constructor(table: string, data: any) { this.table = table; this.data = data; }
  select() { return this; }
  single() { return this; }

  async then(resolve: (val: any) => any) {
    try {
      const tn = tableName(this.table);
      const entry = Array.isArray(this.data) ? this.data[0] : this.data;

      if (isTauri && invoke) {
        const cols = Object.keys(entry).filter(k => k !== 'id' || entry[k]);
        const vals = cols.map(k => entry[k]);
        const placeholders = cols.map((_, i) => `?${i + 1}`);
        const sql = `INSERT INTO "${tn}" (${cols.map(c => `"${c}"`).join(',')}) VALUES (${placeholders.join(',')})`;
        await invoke('db_execute', { sql, params: vals });
        resolve({ data: entry, error: null });
      } else {
        const res = await fetch(`${API}/${tn}`, {
          method: 'POST', headers: headers(),
          body: JSON.stringify(entry),
        });
        const data = await res.json();
        resolve(res.ok ? { data, error: null } : { data: null, error: data });
      }
    } catch (err: any) { resolve({ data: null, error: err }); }
  }
  catch(reject: (err: any) => any) { return this.then((v: any) => v).catch(reject); }
}

class UpdateBuilder {
  private table: string;
  private data: any;
  private id = '';

  constructor(table: string, data: any) { this.table = table; this.data = data; }
  eq(_col: string, val: string) { this.id = val; return this; }

  async then(resolve: (val: any) => any) {
    try {
      const tn = tableName(this.table);
      const entry = this.data;

      if (isTauri && invoke) {
        const setClauses = Object.keys(entry).filter(k => entry[k] !== undefined).map((k, i) => `"${k}" = ?${i + 1}`);
        const vals = Object.keys(entry).filter(k => entry[k] !== undefined).map(k => entry[k]);
        const sql = `UPDATE "${tn}" SET ${setClauses.join(',')} WHERE "id" = ?${vals.length + 1}`;
        vals.push(this.id);
        await invoke('db_execute', { sql, params: vals });
        resolve({ data: entry, error: null });
      } else {
        const res = await fetch(`${API}/${tn}/${this.id}`, {
          method: 'PATCH', headers: headers(),
          body: JSON.stringify(entry),
        });
        const data = await res.json();
        resolve(res.ok ? { data, error: null } : { data: null, error: data });
      }
    } catch (err: any) { resolve({ data: null, error: err }); }
  }
  catch(reject: (err: any) => any) { return this.then((v: any) => v).catch(reject); }
}

class DeleteBuilder {
  private table: string;
  private id = '';

  constructor(table: string) { this.table = table; }
  eq(_col: string, val: string) { this.id = val; return this; }

  async then(resolve: (val: any) => any) {
    try {
      const tn = tableName(this.table);

      if (isTauri && invoke) {
        const sql = `DELETE FROM "${tn}" WHERE "id" = ?1`;
        await invoke('db_execute', { sql, params: [this.id] });
        resolve({ data: null, error: null });
      } else {
        const res = await fetch(`${API}/${tn}/${this.id}`, { method: 'DELETE', headers: headers() });
        if (!res.ok) { const data = await res.json().catch(() => ({})); resolve({ data: null, error: data }); return; }
        resolve({ data: null, error: null });
      }
    } catch (err: any) { resolve({ data: null, error: err }); }
  }
  catch(reject: (err: any) => any) { return this.then((v: any) => v).catch(reject); }
}

class LocalClient {
  from(table: string) {
    return {
      select: (cols: string, opts?: any) => new QueryBuilder(table).select(cols, opts),
      insert: (data: any) => new InsertBuilder(table, data),
      update: (data: any) => new UpdateBuilder(table, data),
      delete: () => new DeleteBuilder(table),
    };
  }
}

export const supabase = new LocalClient();
