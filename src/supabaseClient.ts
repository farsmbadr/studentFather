// Local API client - replaces Supabase entirely

const API = '/api';

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
      const params = new URLSearchParams();
      if (this.orderCol)
        params.set('order', `${this.orderCol}.${this.orderAsc ? 'asc' : 'desc'}`);
      if (this.limitVal) params.set('limit', String(this.limitVal));
      // First eq filter (status) goes as query param for server-side filtering
      const statusFilter = this.filters.find(f => f.col === 'status');
      if (statusFilter) params.set('status', statusFilter.val);

      const qs = params.toString();
      const url = `${API}/${tn}${qs ? '?' + qs : ''}`;
      const res = await fetch(url, { headers: headers() });

      if (this.countVal) {
        resolve({ data: null, count: 0, error: null });
        return;
      }

      if (res.status === 404) { resolve({ data: null, error: null }); return; }

      let data = await res.json();

      // Apply remaining filters (eq) client-side
      for (const f of this.filters) {
        if (f.col !== 'status') {
          data = data.filter((r: any) => String(r[f.col]) === f.val);
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
      const res = await fetch(`${API}/${tn}`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify(this.data),
      });
      const data = await res.json();
      resolve(res.ok ? { data, error: null } : { data: null, error: data });
    } catch (err: any) { resolve({ data: null, error: err }); }
  }
  catch(reject: (err: any) => any) { return this.then((v: any) => v).catch(reject); }
}

class UpdateBuilder {
  private table: string;
  private data: any;
  private id = '';

  constructor(table: string, data: any) { this.table = table; this.data = data; }
  eq(col: string, val: string) { this.id = val; return this; }

  async then(resolve: (val: any) => any) {
    try {
      const tn = tableName(this.table);
      const res = await fetch(`${API}/${tn}/${this.id}`, {
        method: 'PATCH', headers: headers(),
        body: JSON.stringify(this.data),
      });
      const data = await res.json();
      resolve(res.ok ? { data, error: null } : { data: null, error: data });
    } catch (err: any) { resolve({ data: null, error: err }); }
  }
  catch(reject: (err: any) => any) { return this.then((v: any) => v).catch(reject); }
}

class DeleteBuilder {
  private table: string;
  private id = '';

  constructor(table: string) { this.table = table; }
  eq(col: string, val: string) { this.id = val; return this; }

  async then(resolve: (val: any) => any) {
    try {
      const tn = tableName(this.table);
      const res = await fetch(`${API}/${tn}/${this.id}`, { method: 'DELETE', headers: headers() });
      if (!res.ok) { const data = await res.json().catch(() => ({})); resolve({ data: null, error: data }); return; }
      resolve({ data: null, error: null });
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
