import { useState, useEffect, useRef } from 'react';
import { X, Plus, FileDown, Printer, RefreshCw, Barcode, User, Edit2, Trash2, KeyRound, ChevronDown, Search, Filter, Users, BookOpen } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { StudentAction } from '../types';
import ListTemplate from '../components/ListTemplate';
import { useToast } from '../components/Toast';
import JsBarcode from 'jsbarcode';
import PaymentModal from '../components/PaymentModal';
import { printHeaderHtml, printFooterHtml, printHeaderStyle } from '../utils/printHeader';

interface Student {
  id: string;
  name: string;
  code: string;
  grade: string;
  gender: string;
  group_name: string;
  phone: string;
  parent_phone?: string;
  parent_name?: string;
  address?: string;
  status: string;
  monthly_fee: number;
  join_date: string;
  notes?: string;
  photo_url?: string;
  booking_deposit?: number;
  school?: string;
  division?: string;
  parent_job?: string;
  deletion_reason?: string;
  birth_date?: string;
  email?: string;
}

function generateCode(existing: string[]): string {
  let code: string;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (existing.includes(code));
  return code;
}

function StudentModal({ onClose, onSave, initial, groups, allSubjects, allGrades, studentSubjects, onSubjectToggle }: { onClose: () => void; onSave: (d: Omit<Student, 'id'>) => void; initial?: Student;   groups?: {name:string;capacity:number;studentCount:number;remaining:number;fee:number}[]; allSubjects: {id:string;name:string}[]; allGrades: {id:string;name:string}[]; studentSubjects: string[]; onSubjectToggle: (subjectId: string) => void }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    code: initial?.code || '',
    grade: initial?.grade || (allGrades[0]?.name || ''),
    gender: initial?.gender || 'ذكر',
    group_name: initial?.group_name || '',
    phone: initial?.phone || '',
    parent_name: initial?.parent_name || '',
    parent_phone: initial?.parent_phone || '',
    status: initial?.status || 'active',
    monthly_fee: initial?.monthly_fee || 0,
    join_date: initial?.join_date || new Date().toISOString().split('T')[0],
    notes: initial?.notes || '',
    booking_deposit: initial?.booking_deposit || 0,
    address: initial?.address || '',
    school: initial?.school || '',
    division: initial?.division || 'عام',
    parent_job: initial?.parent_job || '',
    birth_date: initial?.birth_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    email: initial?.email || '',
  });
  const [showExtra, setShowExtra] = useState(!!initial);

  const set = (k: string, v: string | number) => {
    if (k === 'phone' || k === 'parent_phone') {
      v = String(v).replace(/\D/g, '').slice(0, 11);
    }
    setForm(f => ({ ...f, [k]: v }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-8">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-bold text-gray-800">{initial ? 'تعديل بيانات طالب' : 'إضافة طالب جديد'}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="p-5 grid grid-cols-4 gap-4 max-h-[600px] overflow-y-auto">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">كود الطالب</label>
            <input type="text" value={form.code} onChange={e => set('code', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 font-mono" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">اسم الطالب <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">الصف <span className="text-red-500">*</span></label>
            <select value={form.grade} onChange={e => set('grade', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
              <option value="">اختر الصف</option>
              {allGrades.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">المجموعة <span className="text-red-500">*</span></label>
            <select value={form.group_name} onChange={e => {
              const v = e.target.value;
              set('group_name', v);
              if (!initial) {
                const g = (groups || []).find(gr => gr.name === v);
                if (g && g.fee) set('monthly_fee', g.fee);
              }
            }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
              <option value="">— اختر —</option>
              {(groups || []).map((g, idx) => <option key={g.name + idx} value={g.name}>
                {g.name} ({g.remaining}/{g.capacity}{g.remaining === 0 ? ' ❌ ممتلئة' : ''})
              </option>)}
            </select>
            {form.group_name && (() => {
              const g = (groups || []).find(gr => gr.name === form.group_name);
              if (!g) return null;
              const pct = g.capacity > 0 ? Math.round((g.studentCount / g.capacity) * 100) : 0;
              const barColor = g.remaining > 3 ? 'bg-green-500' : g.remaining > 0 ? 'bg-amber-500' : 'bg-red-500';
              return (
                <div className="mt-1.5">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-0.5">
                    <span>{g.studentCount} طالب مسجل</span>
                    <span className={g.remaining === 0 ? 'text-red-600 font-bold' : 'text-gray-500'}>متبقي {g.remaining} مقعد{g.remaining !== 1 ? 'ًا' : ''}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{width:`${Math.min(pct,100)}%`}} />
                  </div>
                </div>
              );
            })()}
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">رقم الموبايل <span className="text-red-500">*</span></label>
            <input type="text" inputMode="numeric" maxLength={11} value={form.phone} onChange={e => set('phone', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">موبايل ولي الأمر</label>
            <input type="text" inputMode="numeric" maxLength={11} value={form.parent_phone} onChange={e => set('parent_phone', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">قيمة المصروفات</label>
            <input type="number" value={form.monthly_fee} onChange={e => set('monthly_fee', +e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">مقدم الحجز</label>
            <input type="number" value={form.booking_deposit} onChange={e => set('booking_deposit', +e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
          </div>
          <div className="col-span-4">
            <label className="text-xs text-gray-500 mb-1 block">ملحوظات</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
          </div>

          <div className="col-span-4">
            <label className="text-xs text-gray-500 mb-1.5 block font-semibold">المواد</label>
            <div className="flex flex-wrap gap-1.5">
              {allSubjects.map(sub => {
                const active = studentSubjects.includes(sub.id);
                return (
                  <button key={sub.id} onClick={() => onSubjectToggle(sub.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${active ? 'bg-pink-100 text-pink-700 border-pink-200' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'}`}>
                    {active ? '✓ ' : ''}{sub.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Extra Data Toggle */}
          <div className="col-span-4 border-t pt-4 mt-2">
            <button onClick={() => setShowExtra(o => !o)} className="flex items-center gap-2 text-sm text-pink-500 hover:text-pink-600 font-medium transition-colors">
              <span className={`w-5 h-5 rounded-full border-2 border-pink-400 flex items-center justify-center transition-transform ${showExtra ? 'rotate-45' : ''}`}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </span>
              بيانات إضافية
            </button>
          </div>

          {showExtra && (
            <>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ولي الأمر</label>
                <input type="text" value={form.parent_name} onChange={e => set('parent_name', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">النوع</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
                  <option value="ذكر">ذكر</option>
                  <option value="أنثى">أنثى</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">العنوان</label>
                <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">المدرسة</label>
                <input type="text" value={form.school} onChange={e => set('school', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">الشعبة</label>
                <select value={form.division} onChange={e => set('division', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
                  <option value="عام">عام</option>
                  <option value="علمي">علمي</option>
                  <option value="أدبي">أدبي</option>
                  <option value="طب وعلوم الحياة">طب وعلوم الحياة</option>
                  <option value="هندسة وعلوم الحاسب">هندسة وعلوم الحاسب</option>
                  <option value="محاسبة وإدارة الأعمال">محاسبة وإدارة الأعمال</option>
                  <option value="آداب وفنون">آداب وفنون</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">وظيفة ولي الأمر</label>
                <input type="text" value={form.parent_job} onChange={e => set('parent_job', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">تاريخ الميلاد</label>
                <input type="date" value={(form.birth_date || '').slice(0, 10)} onChange={e => set('birth_date', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 text-left" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">الإيميل</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
              </div>
            </>
          )}
        </div>
        <div className="flex items-center justify-between p-5 border-t">
          <div className="flex items-center gap-1">
            <span className="text-gray-400">{/*<Info size={14} />*/}</span>
            <span className="text-xs text-gray-400"></span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">إلغاء</button>
            <button onClick={() => onSave({ ...form as unknown as Omit<Student, 'id'>, birth_date: form.birth_date })} className="px-6 py-2 text-sm text-white bg-pink-500 hover:bg-pink-600 rounded-lg transition-colors">{initial ? 'حفظ التعديلات' : 'إضافة الطالب'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentFileModal({ student, onClose, subjects }: { student: Student; onClose: () => void; subjects: string[] }) {
  const fields: [string, string | number][] = [
    ['الكود', student.code],
    ['الاسم', student.name],
    ['النوع', student.gender],
    ['المرحلة', student.grade],
    ['المجموعة', student.group_name],
    ['المواد', subjects.length > 0 ? subjects.join(' - ') : '—'],
    ['المدرسة', student.school || '—'],
    ['الشعبة', student.division || '—'],
    ['الهاتف', student.phone],
    ['تاريخ الميلاد', student.birth_date ? student.birth_date.slice(0, 10).split('-').reverse().join('/') : '—'],
    ['الإيميل', student.email || '—'],
    ['ولي الأمر', student.parent_name || '—'],
    ['هاتف ولي الأمر', student.parent_phone || '—'],
    ['وظيفة ولي الأمر', student.parent_job || '—'],
    ['العنوان', student.address || '—'],
    ['تاريخ التقديم', new Date(student.join_date).toLocaleString('ar-EG')],
    ['مقدم الحجز', student.booking_deposit ? `${student.booking_deposit} ج` : '—'],
    ['الرسوم الشهرية', `${student.monthly_fee} ج`],
  ];
  if (student.notes) fields.push(['ملحوظات', student.notes]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-bold text-gray-800">ملف الطالب</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          {fields.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="font-semibold text-gray-800">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end p-5 border-t">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إغلاق</button>
        </div>
      </div>
    </div>
  );
}

function OptionsMenu({ student, onEdit, onDelete, onView, onBarcode, onResetPass }: {
  student: Student;
  onEdit: (s: Student) => void;
  onDelete: (id: string) => void;
  onView: (s: Student) => void;
  onBarcode: (s: Student) => void;
  onResetPass: (s: Student) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const items = [
    { icon: <Barcode size={15} />, label: 'طباعة باركود', action: () => { onBarcode(student); setOpen(false); } },
    { icon: <User size={15} />, label: 'عرض ملف الطالب', action: () => { onView(student); setOpen(false); } },
    { icon: <Edit2 size={15} />, label: 'تعديل الطالب', action: () => { onEdit(student); setOpen(false); } },
    { icon: <Trash2 size={15} />, label: 'حذف الطالب', action: () => { onDelete(student.id); setOpen(false); } },
    { icon: <KeyRound size={15} />, label: 'تهئية كلمة السر', action: () => { onResetPass(student); setOpen(false); } },
  ];

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
        خيارات <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 min-w-44 py-1">
          {items.map(item => (
            <button key={item.label} onClick={item.action}
              className="flex items-center gap-2.5 w-full text-right px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <span className="text-gray-400">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Students({ searchQuery = '', studentAction, onViewStudent, editStudentId, onClearEdit, deleteStudentId, onClearDelete }: { searchQuery?: string; studentAction?: StudentAction; onViewStudent?: (id: string) => void; editStudentId?: string | null; onClearEdit?: () => void; deleteStudentId?: string | null; onClearDelete?: () => void }) {
  const { show, confirm } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchQuery);
  useEffect(() => { if (searchQuery) setSearch(searchQuery); }, [searchQuery]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState<Student | undefined>();
  const [viewStudent, setViewStudent] = useState<Student | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [filterGrade, setFilterGrade] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [allGroups, setAllGroups] = useState<{name:string;capacity:number;studentCount:number;remaining:number}[]>([]);
  const [paymentsByStudent, setPaymentsByStudent] = useState<Record<string, number>>({});
  const [paymentTarget, setPaymentTarget] = useState<Student | null>(null);
  const [allSubjects, setAllSubjects] = useState<{id:string;name:string}[]>([]);
  const [allGrades, setAllGrades] = useState<{id:string;name:string}[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<string[]>([]);
  const [studentSubjectsMap, setStudentSubjectsMap] = useState<Record<string, string[]>>({});
  const [centerName, setCenterName] = useState('CenterMasr');
  const [centerAddress, setCenterAddress] = useState('');
  const [centerPhone, setCenterPhone] = useState('');
  const [centerLogo, setCenterLogo] = useState('');

  const load = async () => {
    setLoading(true);
    const [stuRes, grpRes, payRes, subRes, ssRes, cfgRes, grdRes] = await Promise.all([
      supabase.from('students').select('*').eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('groups').select('name, capacity, fee'),
      supabase.from('payments').select('*'),
      supabase.from('subjects').select('name, id').order('name'),
      supabase.from('subject_students').select('*'),
      supabase.from('center_config').select('center_name,address,phone,logo').maybeSingle(),
      supabase.from('grades').select('*').order('name', { ascending: true }),
    ]);
    setStudents(stuRes.data || []);
    setAllSubjects((subRes.data || []).map(s => ({ id: s.id, name: s.name })));
    setAllGrades((grdRes.data || []).map(g => ({ id: g.id, name: g.name })));
    // Build student subject map
    const ssMap: Record<string, string[]> = {};
    for (const ss of ssRes.data || []) {
      if (!ssMap[ss.student_id]) ssMap[ss.student_id] = [];
      const sub = (subRes.data || []).find(s => s.id === ss.subject_id);
      if (sub) ssMap[ss.student_id].push(sub.name);
    }
    setStudentSubjectsMap(ssMap);
    const { data: allStudents } = await supabase.from('students').select('group_name').eq('status', 'active');
    const groupCounts: Record<string, number> = {};
    for (const s of allStudents || []) { if (s.group_name) groupCounts[s.group_name] = (groupCounts[s.group_name] || 0) + 1; }
    const seen = new Set<string>();
    setAllGroups((grpRes.data || []).filter(g => { if (seen.has(g.name)) return false; seen.add(g.name); return true; }).map((g: any) => ({
      name: g.name,
      capacity: g.capacity || 20,
      studentCount: groupCounts[g.name] || 0,
      remaining: Math.max(0, (g.capacity || 20) - (groupCounts[g.name] || 0)),
      fee: Number(g.fee) || 0
    })).sort((a, b) => a.name.localeCompare(b.name, 'ar')));
    // Total outstanding: process payments chronologically, pay oldest debt first
    const sortedPayments = (payRes.data || []).filter(p => p.date).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const now = new Date();
    const grouped: Record<string, number> = {};
    for (const s of stuRes.data || []) {
      if (!s.join_date || !s.monthly_fee) continue;
      const jd = new Date(s.join_date);
      const months: { remaining: number }[] = [];
      let yy = jd.getFullYear(), mm = jd.getMonth();
      while (yy < now.getFullYear() || (yy === now.getFullYear() && mm <= now.getMonth())) {
        months.push({ remaining: Math.max(0, Number(s.monthly_fee) - (yy === jd.getFullYear() && mm === jd.getMonth() ? Number(s.booking_deposit || 0) : 0)) });
        mm++; if (mm > 11) { mm = 0; yy++; }
      }
      for (const p of sortedPayments) {
        if (p.student_id !== s.id) continue;
        let amt = Number(p.amount);
        for (const mo of months) {
          if (amt <= 0) break;
          if (mo.remaining > 0) {
            const payNow = Math.min(amt, mo.remaining);
            mo.remaining -= payNow;
            amt -= payNow;
          }
        }
      }
      grouped[s.id] = months.reduce((sum, mo) => sum + mo.remaining, 0);
    }
    setPaymentsByStudent(grouped);
    if (cfgRes.data) { setCenterName((cfgRes.data as any).center_name || 'CenterMasr'); setCenterAddress((cfgRes.data as any).address || ''); setCenterPhone((cfgRes.data as any).phone || ''); setCenterLogo((cfgRes.data as any).logo || ''); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => { setSearch(searchQuery); }, [searchQuery]);

  useEffect(() => {
    if (studentAction === 'add') { setEditing(undefined); setShowAddModal(true); }
    else { setShowAddModal(false); }
  }, [studentAction]);

  useEffect(() => {
    if (editStudentId && students.length > 0) {
      const s = students.find(st => st.id === editStudentId);
      if (s) {
        setEditing(s);
        supabase.from('subject_students').select('*').then(res => {
          setStudentSubjects((res.data || []).filter(ss => ss.student_id === s.id).map(ss => ss.subject_id));
        });
        setShowAddModal(true); onClearEdit?.();
      }
    }
  }, [editStudentId, students]);

  useEffect(() => {
    if (deleteStudentId && students.length > 0) {
      const s = students.find(st => st.id === deleteStudentId);
      if (s) { setDeleteTarget(s.id); onClearDelete?.(); }
    }
  }, [deleteStudentId, students]);

  const addNotif = async (title: string, message: string) => {
    await supabase.from('notifications').insert({ title, message, target: 'all', is_read: false });
  };

  const save = async (form: Omit<Student, 'id'>) => {
    if (!form.name.trim()) return show('اسم الطالب مطلوب', 'error');
    if (!form.grade) return show('الصف مطلوب', 'error');
    if (!form.group_name) return show('المجموعة مطلوبة', 'error');
    if (!form.phone.trim()) return show('رقم الموبايل مطلوب', 'error');
    const toSave = editing ? form : { ...form, code: form.code || generateCode(students.map(s => s.code)) };
    let studentId = editing?.id;
    if (editing) {
      if (toSave.birth_date === '') delete toSave.birth_date;
      await supabase.from('students').update(toSave).eq('id', editing.id);
      addNotif('تعديل بيانات طالب', `تم تعديل بيانات الطالب ${form.name}`);
    } else {
      if (!toSave.birth_date) toSave.birth_date = new Date().toISOString().slice(0, 10);
      const insertRes = await supabase.from('students').insert(toSave);
      if (insertRes.error) { show('خطأ في إضافة الطالب'); console.error(insertRes.error); return; }
      studentId = insertRes.data?.id;
      addNotif('إضافة طالب جديد', `تم إضافة الطالب ${form.name}`);
    }
    // Sync subject_students
    if (studentId) {
      const { data: existing } = await supabase.from('subject_students').select('*');
      const currentIds = (existing || []).filter(ss => ss.student_id === studentId).map(ss => ss.subject_id);
      const toAdd = studentSubjects.filter(s => !currentIds.includes(s));
      const toRemove = currentIds.filter(s => !studentSubjects.includes(s));
      for (const sub of toAdd) await supabase.from('subject_students').insert({ student_id: studentId, subject_id: sub });
      for (const ss of (existing || []).filter(x => x.student_id === studentId && toRemove.includes(x.subject_id))) {
        await supabase.from('subject_students').delete().eq('id', ss.id);
      }
    }
    // Create payment record for booking deposit (if not already exists)
    const deposit = Number(form.booking_deposit);
    if (studentId && deposit > 0) {
      const { data: existingDep } = await supabase.from('payments').select('*').eq('student_id', studentId).eq('notes', 'مقدم حجز');
      if (!existingDep || existingDep.length === 0) {
        await supabase.from('payments').insert({
          student_id: studentId,
          student_name: form.name,
          amount: deposit,
          date: new Date().toISOString().slice(0, 10),
          received_by: 'مقدم حجز',
          notes: 'مقدم حجز',
          is_archived: false,
        });
      }
    }
    show(editing ? 'تم تعديل بيانات الطالب' : 'تم إضافة الطالب بنجاح');
    setShowAddModal(false);
    setEditing(undefined);
    setStudentSubjects([]);
    load();
  };

  const remove = async (id: string, reason: string) => {
    const s = students.find(st => st.id === id);
    await supabase.from('students').update({ status: 'deleted', deleted_at: new Date().toISOString(), deletion_reason: reason }).eq('id', id);
    addNotif('حذف طالب', `تم نقل الطالب ${s?.name || ''} إلى الأرشيف - ${reason}`);
    show('تم نقل الطالب إلى الأرشيف');
    load();
  };

  const grades = allGrades.map(g => g.name);
  const studentGroupNames = [...new Set(students.map(s => s.group_name))].filter(Boolean).sort();

  const filtered = students.filter(s => {
    if (!s.name.includes(search) && !s.code.includes(search) && !s.phone.includes(search)) return false;
    if (filterGrade === '__none__') { if (s.grade) return false; } else if (filterGrade && s.grade !== filterGrade) return false;
    if (filterGroup === '__none__') { if (s.group_name) return false; } else if (filterGroup && s.group_name !== filterGroup) return false;
    return true;
  });

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = filtered.map((s, i) => {
      const total = paymentsByStudent[s.id] || 0;
      const status = total > 0 ? `باقي ${total} ج` : 'مدفوع بالكامل ✓';
      return `<tr>
        <td>${s.code}</td>
        <td style="font-weight:bold">${s.name}</td>
        <td>${s.grade}</td>
        <td>${s.gender}</td>
        <td style="direction:ltr;text-align:left">${s.phone}</td>
        <td>${s.parent_name || '—'}</td>
        <td style="direction:ltr;text-align:left">${s.parent_phone || '—'}</td>
        <td>${s.group_name || '—'}</td>
        <td>${status}</td>
        <td>${new Date(s.join_date).toLocaleDateString('ar-EG')}</td>
      </tr>`;
    }).join('');
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>قائمة الطلاب</title>
      <style>
        @page { size: landscape; margin: 5mm; }
        ${printHeaderStyle()}
        .content { padding: 2mm 0; }
        h2 { text-align: center; font-size: 14pt; color: #1e3a5f; margin: 0 0 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 12pt; }
        th { background: #1e3a5f; color: white; padding: 5px 3px; text-align: center; font-weight: bold; }
        td { padding: 3px 3px; border-bottom: 1px solid #ddd; text-align: center; }
        tr:nth-child(even) { background: #f8f9fa; }
      </style></head><body>
      ${printHeaderHtml({ center_name: centerName, address: centerAddress, phone: centerPhone, logo: centerLogo })}
      <div class="content">
      <h2>قائمة الطلاب</h2>
      <table>
        <thead><tr><th>#</th><th>اسم الطالب</th><th>المرحلة</th><th>النوع</th><th>موبايل الطالب</th><th>ولي الأمر</th><th>موبايل ولي الأمر</th><th>المجموعة</th><th>المصروفات</th><th>تاريخ التقديم</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      </div>
      ${printFooterHtml()}
      </body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); w.close(); }, 500);
  };

  return (
    <div className="fade-in space-y-4">
      {showAddModal && (
        <StudentModal
          onClose={() => { setShowAddModal(false); setEditing(undefined); setStudentSubjects([]); }}
          onSave={save}
          initial={editing}
          groups={allGroups}
          allSubjects={allSubjects}
          allGrades={allGrades}
          studentSubjects={studentSubjects}
          onSubjectToggle={id => setStudentSubjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
        />
      )}

      {viewStudent && <StudentFileModal student={viewStudent} onClose={() => setViewStudent(undefined)} subjects={studentSubjectsMap[viewStudent.id] || []} />}

      {paymentTarget && <PaymentModal key={paymentTarget.id} student={paymentTarget} onClose={() => setPaymentTarget(null)} onDone={load} alreadyPaid={paymentsByStudent[paymentTarget.id] || 0} />}

      {deleteTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-3xl mb-3">🗑️</div>
            <p className="text-sm text-gray-700 mb-5 font-semibold">سبب الحذف / النقل إلى الأرشيف؟</p>
            <div className="space-y-3">
              <button onClick={async () => { await remove(deleteTarget, 'منقطع'); setDeleteTarget(null); }}
                className="w-full bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl px-4 py-3 text-sm font-semibold transition-colors">
                منقطع
              </button>
              <button onClick={async () => { await remove(deleteTarget, 'سحب'); setDeleteTarget(null); }}
                className="w-full bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-xl px-4 py-3 text-sm font-semibold transition-colors">
                سحب
              </button>
            </div>
            <button onClick={() => setDeleteTarget(null)}
              className="mt-4 text-xs text-gray-400 hover:text-gray-600 transition-colors">إلغاء</button>
          </div>
        </div>
      )}

      <ListTemplate
        title="قائمة الطلاب"
        data={filtered}
        keyExtractor={s => s.id}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث بالاسم أو الكود أو الهاتف..."
        loading={loading}
        emptyMessage="لا يوجد طلاب حتى الآن"
        emptyIcon={<User size={40} className="mx-auto text-gray-300" />}
        onAdd={() => { setEditing(undefined); setShowAddModal(true); }}
        onExport={() => {}}
        onPrint={handlePrint}
        onRefresh={load}
        extraButtons={[
          {
            label: filterGrade === '__none__' ? 'بدون صف' : filterGrade || 'عرض صف', icon: <Filter size={16} />, color: filterGrade ? 'bg-purple-700' : 'bg-purple-500',
            dropdownItems: [{ label: 'الكل', onClick: () => setFilterGrade('') }, { label: 'بدون صف', onClick: () => setFilterGrade('__none__') }, ...grades.map(g => ({ label: g, onClick: () => setFilterGrade(g) }))]
          },
          {
            label: filterGroup || 'عرض مجموعة', icon: <Users size={16} />, color: filterGroup ? 'bg-amber-700' : 'bg-amber-500',
            dropdownItems: [{ label: 'الكل', onClick: () => setFilterGroup('') }, ...studentGroupNames.map(g => ({ label: g, onClick: () => setFilterGroup(g) })), { label: 'بدون مجموعة', onClick: () => setFilterGroup('__none__') }]
          },
        ]}
        columns={[
          {
            key: 'code', label: '#', render: s => <span className="font-mono text-gray-600 font-bold">{s.code}</span>
          },
          {
            key: 'name', label: 'اسم الطالب', render: s => <span className="font-semibold text-gray-800">{s.name}</span>
          },
          {
            key: 'grade', label: 'المرحلة', render: s => <span className="text-gray-600">{s.grade}</span>
          },
          {
            key: 'gender', label: 'النوع', render: s => <span className="text-gray-600">{s.gender}</span>
          },
          {
            key: 'phone', label: 'موبايل الطالب', render: s => <span className="text-gray-600 dir-ltr">{s.phone}</span>
          },
          {
            key: 'parent_phone', label: 'موبايل ولي الأمر', render: s => <span className="text-gray-600 dir-ltr">{s.parent_phone || '—'}</span>
          },
          {
            key: 'group_name', label: 'المجموعات', render: s => <span className="text-gray-600">{s.group_name || '—'}</span>
          },
          {
            key: 'status', label: 'حالة المصروفات', render: s => {
              const total = paymentsByStudent[s.id] || 0;
              if (total === 0) return <span onClick={() => setPaymentTarget(s)} className="cursor-pointer px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">مدفوع بالكامل ✓</span>;
              return <span onClick={() => setPaymentTarget(s)} className="cursor-pointer px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">باقي {total} ج</span>;
            }
          },
          {
            key: 'join_date', label: 'تاريخ التقديم', render: s => <span className="text-gray-600">{new Date(s.join_date).toLocaleString('ar-EG')}</span>
          },
          {
            key: 'actions', label: '', sortable: false, render: s => (
              <OptionsMenu
                student={s}
                onEdit={s => {
                  setEditing(s); setShowAddModal(true);
                  supabase.from('subject_students').select('*').then(res => {
                    setStudentSubjects((res.data || []).filter(ss => ss.student_id === s.id).map(ss => ss.subject_id));
                  });
                }}
                onDelete={id => setDeleteTarget(id)}
                onView={s => onViewStudent ? onViewStudent(s.id) : setViewStudent(s)}
                onBarcode={async s => {
                  const w = window.open('', '_blank');
                  if (!w) return show('الرجاء السماح بالنوافذ المنبثقة', 'error');
                  const canvas = document.createElement('canvas');
                  try {
                    JsBarcode(canvas, s.code, { format: 'CODE128', width: 2, height: 60, displayValue: false, margin: 0 });
                  } catch {}
                  const barcodeData = canvas.toDataURL('image/png');
                  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>بطاقة الطالب - ${s.name}</title>
                    <style>
                      @page { margin: 10mm; size: auto; }
                      body { margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f0f0f0; }
                      .card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); padding: 30px 40px; text-align: center; width: 320px; margin: 0 auto; }
                      .logo-bar { background: #1e3a5f; color: white; padding: 10px 20px; border-radius: 10px; font-size: 14pt; font-weight: bold; margin-bottom: 20px; display:flex;align-items:center;justify-content:center;gap:8px; }
                      .logo-bar img { height: 28px; width: auto; }
                      .name { font-size: 24pt; font-weight: bold; color: #1e3a5f; margin-bottom: 15px; }
                      .info-row { display: flex; justify-content: center; gap: 20px; font-size: 14pt; color: #555; margin-bottom: 8px; }
                      .info-row span { background: #f5f7fa; padding: 4px 12px; border-radius: 20px; }
                      .barcode-wrap { background: white; padding: 10px; border-radius: 8px; margin: 15px 0; }
                      .barcode-wrap img { width: 100%; max-width: 240px; }
                      .code { font-size: 16pt; color: #1e3a5f; font-weight: bold; letter-spacing: 2px; direction: ltr; }
                      .footer { font-size: 11pt; color: #aaa; margin-top: 12px; }
                    </style></head><body>
                    <div class="card">
                      <div class="logo-bar">${centerLogo ? `<img src="${centerLogo}" alt="logo"/>` : ''}${centerName}</div>
                      <div class="name">${s.name}</div>
                      <div class="info-row">
                        <span>📚 ${s.grade}</span>
                        <span>👥 ${s.group_name || '—'}</span>
                      </div>
                      <div class="barcode-wrap"><img src="${barcodeData}" alt="barcode" /></div>
                      <div class="code">${s.code}</div>
                      <div class="footer">CenterMasr - النظام المتكامل لإدارة المراكز التعليمية</div>
                    </div>
                    <script>window.onload=function(){window.print();window.close()};<\/script>
                    </body></html>`);
                  w.document.close();
                }}
                onResetPass={async s => {
                  const pass = s.phone.replace(/[^0-9]/g, '');
                  await supabase.from('students').update({ password: pass }).eq('id', s.id);
                  show(`تم تغيير كلمة السر إلى ${s.phone}`);
                }}
              />
            )
          },
        ]}
      />
    </div>
  );
}
