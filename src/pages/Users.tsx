import { useState, useEffect } from 'react';
import { Plus, X, UserCog, Edit2, Trash2, Shield, Lock, Eye, EyeOff, CheckSquare, Square, Save, BookMarked } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import { getCurrentUser } from '../auth';

interface AppUser {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: string;
  status: string;
  phone?: string;
  must_change_password?: boolean;
  permissions: string[];
  is_super_admin?: boolean;
  created_at: string;
}

interface CustomRole {
  id: string;
  name: string;
  permissions: string[];
  created_at: string;
}

const builtInRoles = ['مدير', 'محاسب', 'مدرس', 'إدارى', 'استقبال'];

const rolePermissions: Record<string, string[]> = {
  'مدير': ['all'],
  'محاسب': ['daily-report', 'revenues', 'deposits-report', 'revenue-archive', 'late-payers', 'group-fees', 'expenses', 'expense-archive', 'monthly-stats', 'finance-report'],
  'مدرس': ['students', 'student-report', 'absence', 'absence-reports', 'absence-latest', 'absence-warnings', 'absence-sheet', 'exam-list', 'exam-top-scorers', 'exam-group-report', 'exam-score-sheet', 'exam-statistics', 'exam-essay-grading', 'question-bank', 'subjects', 'groups', 'notifications', 'publications'],
  'إدارى': ['students', 'student-report', 'archive', 'absence', 'absence-reports', 'absence-latest', 'absence-warnings', 'absence-sheet', 'book-list', 'book-profits', 'book-delivery', 'supplier-list', 'publications', 'groups', 'classes', 'subjects'],
  'استقبال': ['students', 'student-report', 'absence', 'publications'],
};

const permGroups = [
  { label: 'إدارة الطلاب', icon: '👤', perms: [
    { key: 'students', label: 'قائمة الطلاب' }, { key: 'student-report', label: 'إجماليات ونسب' }, { key: 'archive', label: 'أرشيف الطلاب' },
  ] },
  { label: 'إدارة الغياب', icon: '📋', perms: [
    { key: 'absence', label: 'تسجيل الغياب' }, { key: 'absence-reports', label: 'إجماليات ونسب' }, { key: 'absence-latest', label: 'آخر التسجيلات' }, { key: 'absence-warnings', label: 'إنذارات الغياب' }, { key: 'absence-sheet', label: 'كشف غياب شهري' },
  ] },
  { label: 'إدارة الاختبارات', icon: '📝', perms: [
    { key: 'exam-list', label: 'قائمة الاختبارات' }, { key: 'exam-top-scorers', label: 'أوائل الاختبارات' }, { key: 'exam-group-report', label: 'تقرير مجموعة' }, { key: 'exam-score-sheet', label: 'كشف الدرجات' }, { key: 'exam-statistics', label: 'إجماليات ونسب' }, { key: 'exam-essay-grading', label: 'تصحيح مقالي' }, { key: 'question-bank', label: 'بنك الأسئلة' },
  ] },
  { label: 'الكتب والمطبوعات', icon: '📚', perms: [
    { key: 'book-list', label: 'قائمة الكتب' }, { key: 'book-profits', label: 'أرباح الكتب' }, { key: 'book-delivery', label: 'تسليم كتاب' }, { key: 'supplier-list', label: 'قائمة الموردين' }, { key: 'publications', label: 'المطبوعات' },
  ] },
  { label: 'إدارة الأموال', icon: '💰', perms: [
    { key: 'daily-report', label: 'التقرير اليومى' }, { key: 'revenues', label: 'الإيرادات' }, { key: 'deposits-report', label: 'مقدمات الحجز' }, { key: 'revenue-archive', label: 'أرشيف الإيرادات' }, { key: 'late-payers', label: 'المتخلفون عن الدفع' }, { key: 'group-fees', label: 'تحديد المصروفات' }, { key: 'expenses', label: 'المصروفات والإهلاكات' }, { key: 'expense-archive', label: 'أرشيف المصروفات' }, { key: 'monthly-stats', label: 'إحصائيات الشهر' }, { key: 'finance-report', label: 'إجماليات ونسب' },
  ] },
  { label: 'الإدارة الرئيسية', icon: '⚙️', perms: [
    { key: 'basic-data', label: 'بيانات السنتر' }, { key: 'subjects', label: 'المواد' }, { key: 'classes', label: 'المعلمين' }, { key: 'groups', label: 'المجموعات' }, { key: 'notifications', label: 'الإشعارات' }, { key: 'settings', label: 'الإعدادات' }, { key: 'users', label: 'المستخدمين' }, { key: 'login-log', label: 'سجلات الدخول' },
  ] },
];

function UserModal({ onClose, onSave, initial, isSuperAdmin, customRoles, onRoleSaved }: { onClose: () => void; onSave: (d: any) => void; initial?: AppUser; isSuperAdmin: boolean; customRoles: CustomRole[]; onRoleSaved?: () => void }) {
  const { show } = useToast();
  const [form, setForm] = useState({ name: initial?.name || '', username: initial?.username || '', role: initial?.role || 'موظف', status: initial?.status || 'active', phone: initial?.phone || '', permissions: initial?.permissions || [], password: '' });
  const [showPass, setShowPass] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  const isCustomRole = (r: string) => customRoles.some(c => c.name === r);
  const customRoleNames = customRoles.map(c => c.name);

  // All options for the role dropdown
  const allRoleOptions = [...builtInRoles, ...customRoleNames, 'مخصص'];

  useEffect(() => {
    if (builtInRoles.includes(form.role)) {
      setForm(f => ({ ...f, permissions: rolePermissions[form.role] || [] }));
    } else if (isCustomRole(form.role)) {
      const cr = customRoles.find(c => c.name === form.role);
      if (cr) setForm(f => ({ ...f, permissions: cr.permissions }));
    }
  }, [form.role]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const togglePerm = (key: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(key) ? f.permissions.filter(p => p !== key) : [...f.permissions, key],
    }));
  };

  const saveAsCustomRole = async () => {
    if (!newRoleName.trim()) return show('يرجى إدخال اسم للدور', 'error');
    if (builtInRoles.includes(newRoleName.trim())) return show('هذا الاسم محجوز للأدوار الأساسية', 'error');
    if (customRoleNames.includes(newRoleName.trim())) return show('يوجد دور مخصص بنفس الاسم', 'error');
    setSavingRole(true);
    try {
      const { data } = await supabase.from('custom_roles').insert({ name: newRoleName.trim(), permissions: JSON.stringify(form.permissions) }).select();
      if (data) show(`تم حفظ الدور "${newRoleName.trim()}"`);
      setNewRoleName('');
      onRoleSaved?.();
    } catch { show('فشل حفظ الدور', 'error'); }
    setSavingRole(false);
  };

  const getPermissions = () => {
    if (builtInRoles.includes(form.role)) return rolePermissions[form.role] || [];
    if (isCustomRole(form.role)) {
      const cr = customRoles.find(c => c.name === form.role);
      return cr ? cr.permissions : [];
    }
    return form.permissions;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-800">{initial ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[{ label: 'الاسم الكامل', key: 'name' }, { label: 'اسم المستخدم', key: 'username' }].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">الدور الوظيفي</label>
              <select value={form.role} onChange={e => set('role', e.target.value)} disabled={initial?.is_super_admin || (initial?.role === 'مدير' && !isSuperAdmin)} className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 ${initial?.is_super_admin || (initial?.role === 'مدير' && !isSuperAdmin) ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                <optgroup label="الأدوار الأساسية">
                  {builtInRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </optgroup>
                {customRoleNames.length > 0 && (
                  <optgroup label="الأدوار المخصصة">
                    {customRoleNames.map(r => <option key={r} value={r}>{r}</option>)}
                  </optgroup>
                )}
                <option value="مخصص">─── مخصص ───</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">الحالة</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} disabled={initial?.is_super_admin || (initial?.role === 'مدير' && !isSuperAdmin)} className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 ${initial?.is_super_admin || (initial?.role === 'مدير' && !isSuperAdmin) ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
              {initial?.is_super_admin && <p className="text-xs text-gray-400 mt-1">لا يمكن تعطيل المدير السوبر</p>}
              {initial?.role === 'مدير' && !initial?.is_super_admin && !isSuperAdmin && <p className="text-xs text-gray-400 mt-1">لا يمكنك تعديل مدير آخر</p>}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">رقم الهاتف</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="رقم الهاتف"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            {!initial && (
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">كلمة المرور</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 pl-9" />
                  <button onClick={() => setShowPass(!showPass)} className="absolute left-2 top-2.5 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {form.role === 'مخصص' && (
            <div className="border-t pt-4">
              <label className="text-sm font-semibold text-gray-700 mb-3 block">الصلاحيات</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {permGroups.map(g => (
                  <div key={g.label} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                    <p className="text-xs font-bold text-gray-700 mb-2">{g.icon} {g.label}</p>
                    <div className="space-y-1">
                      {g.perms.map(p => (
                        <label key={p.key} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                          <button onClick={() => togglePerm(p.key)} className="shrink-0">
                            {form.permissions.includes(p.key) ? <CheckSquare size={14} className="text-pink-500" /> : <Square size={14} className="text-gray-300" />}
                          </button>
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1"><Save size={13} /> حفظ كدور مخصص</p>
                <div className="flex gap-2">
                  <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="اسم الدور الجديد"
                    className="flex-1 border border-amber-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  <button onClick={saveAsCustomRole} disabled={savingRole}
                    className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors shrink-0">
                    {savingRole ? 'جاري...' : 'حفظ'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end p-5 border-t">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
          <button onClick={() => onSave({ ...form, permissions: getPermissions() })} className="px-5 py-2 rounded-lg bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900">حفظ</button>
        </div>
      </div>
    </div>
  );
}

function PasswordModal({ user, onClose, isSuperAdmin }: { user: AppUser; onClose: () => void; isSuperAdmin: boolean }) {
  const { show } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });

  const handleSave = async () => {
    if (!isSuperAdmin && !currentPassword) return show('كلمة المرور الحالية مطلوبة', 'error');
    if (!newPassword || newPassword.length < 4) return show('كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل', 'error');
    if (newPassword !== confirmPassword) return show('كلمة المرور غير متطابقة', 'error');
    try {
      const r = await fetch('/api/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, currentPassword, newPassword, skipCurrentPassword: isSuperAdmin })
      });
      const d = await r.json();
      if (!r.ok) return show(d.error || 'فشل تغيير كلمة المرور', 'error');
      show('تم تغيير كلمة المرور بنجاح');
      onClose();
    } catch { show('حدث خطأ', 'error'); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><Lock size={16} /> تغيير كلمة المرور — {user.name}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          {!isSuperAdmin && [{ label: 'كلمة المرور الحالية', key: 'current', val: currentPassword, set: setCurrentPassword }].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
              <div className="relative">
                <input type={(showPass as any)[f.key] ? 'text' : 'password'} value={f.val} onChange={e => f.set(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 pl-9" />
                <button onClick={() => setShowPass(s => ({ ...s, [f.key]: !(s as any)[f.key] }))} className="absolute left-2 top-2.5 text-gray-400 hover:text-gray-600">
                  {(showPass as any)[f.key] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}
          {[
            { label: 'كلمة المرور الجديدة', key: 'new', val: newPassword, set: setNewPassword },
            { label: 'تأكيد كلمة المرور', key: 'confirm', val: confirmPassword, set: setConfirmPassword },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
              <div className="relative">
                <input type={(showPass as any)[f.key] ? 'text' : 'password'} value={f.val} onChange={e => f.set(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 pl-9" />
                <button onClick={() => setShowPass(s => ({ ...s, [f.key]: !(s as any)[f.key] }))} className="absolute left-2 top-2.5 text-gray-400 hover:text-gray-600">
                  {(showPass as any)[f.key] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-end p-5 border-t">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
          <button onClick={handleSave} className="px-5 py-2 rounded-lg bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900">حفظ</button>
        </div>
      </div>
    </div>
  );
}

function RoleManagerModal({ customRoles, onClose, onChanged }: { customRoles: CustomRole[]; onClose: () => void; onChanged: () => void }) {
  const { show, confirm } = useToast();

  const remove = async (id: string) => {
    const ok = await confirm('حذف هذا الدور المخصص؟\nلن يتأثر المستخدمون المعينون بهذا الدور.');
    if (!ok) return;
    await supabase.from('custom_roles').delete().eq('id', id);
    show('تم حذف الدور');
    onChanged();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><BookMarked size={16} /> إدارة الأدوار المخصصة</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-5">
          {customRoles.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">لا توجد أدوار مخصصة</p>
          ) : (
            <div className="space-y-2">
              {customRoles.map(cr => (
                <div key={cr.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{cr.name}</p>
                    <p className="text-xs text-gray-400">{cr.permissions.length} صلاحية</p>
                  </div>
                  <button onClick={() => remove(cr.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end p-5 border-t">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إغلاق</button>
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const { show, confirm } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AppUser | undefined>();
  const [passwordUser, setPasswordUser] = useState<AppUser | undefined>();
  const [showRolesManager, setShowRolesManager] = useState(false);
  const currentUser = getCurrentUser();
  const currentUserData = users.find(u => u.id === currentUser.id);
  const isSuperAdmin = currentUserData?.is_super_admin || false;

  const loadRoles = async () => {
    const { data } = await supabase.from('custom_roles').select('*').order('created_at', { ascending: false });
    setCustomRoles(data || []);
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('app_users').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); loadRoles(); }, []);

  const save = async (form: any) => {
    if (editing && editing.id !== currentUser.id && !isSuperAdmin) return show('فقط المدير السوبر يمكنه تعديل المستخدمين الآخرين', 'error');
    if (editing?.is_super_admin && form.status === 'inactive') return show('لا يمكن تعطيل المدير السوبر', 'error');
    if (editing?.role === 'مدير' && !isSuperAdmin && form.status === 'inactive') return show('لا يمكنك تعطيل مدير آخر', 'error');
    const { password, permissions, ...rest } = form;
    const payload: any = { ...rest, permissions: JSON.stringify(permissions) };
    if (editing) await supabase.from('app_users').update(payload).eq('id', editing.id);
    else await supabase.from('app_users').insert({ ...payload, password: password || '1234' });
    show(editing ? 'تم تعديل المستخدم' : 'تم إضافة المستخدم');
    setShowModal(false); setEditing(undefined); load();
  };

  const remove = async (id: string, targetRole: string) => {
    const target = users.find(u => u.id === id);
    if (target?.is_super_admin) return show('لا يمكن حذف المدير السوبر', 'error');
    if (!isSuperAdmin) return show('فقط المدير السوبر يمكنه حذف المستخدمين', 'error');
    const ok = await confirm('حذف هذا المستخدم؟');
    if (!ok) return;
    await supabase.from('app_users').delete().eq('id', id);
    show('تم حذف المستخدم');
    load();
  };

  const resetPassword = async (u: AppUser) => {
    const ok = await confirm(`إعادة تعيين كلمة المرور لـ ${u.name}؟\nستصبح كلمة المرور آخر 4 أرقام من هاتفه`);
    if (!ok) return;
    try {
      const r = await fetch('/api/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, requestedBy: currentUser.id })
      });
      const d = await r.json();
      if (!r.ok) return show(d.error || 'فشل إعادة التعيين', 'error');
      show(`تم إعادة تعيين كلمة المرور: ${d.newPassword}`);
    } catch { show('حدث خطأ', 'error'); }
  };

  const roleColors: Record<string, string> = { مدير: 'bg-pink-100 text-pink-700', محاسب: 'bg-green-100 text-green-700', مدرس: 'bg-blue-100 text-blue-700', إدارى: 'bg-purple-100 text-purple-700', استقبال: 'bg-amber-100 text-amber-700', مخصص: 'bg-gray-100 text-gray-700' };

  return (
    <div className="fade-in space-y-4">
      {showModal && <UserModal onClose={() => { setShowModal(false); setEditing(undefined); }} onSave={save} initial={editing} isSuperAdmin={isSuperAdmin} customRoles={customRoles} onRoleSaved={loadRoles} />}
      {passwordUser && <PasswordModal user={passwordUser} onClose={() => setPasswordUser(undefined)} isSuperAdmin={isSuperAdmin} />}
      {showRolesManager && <RoleManagerModal customRoles={customRoles} onClose={() => setShowRolesManager(false)} onChanged={loadRoles} />}

      <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl p-5 shadow-lg text-white">
        <div className="flex items-center gap-2">
          <UserCog size={24} />
          <span className="text-lg text-white/80">المستخدمون</span>
          <span className="text-sm bg-white/20 px-3 py-1 rounded-full font-bold mr-auto">{users.length} مستخدم</span>
        </div>
        <p className="text-sm text-white/50 mt-1">إدارة المستخدمين والصلاحيات</p>
      </div>

      {loading ? <div className="text-center py-16 text-gray-400">جاري التحميل...</div> : users.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-12 text-center">
          <UserCog size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 text-sm">لا يوجد مستخدمون</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
              <div className="h-1.5 bg-gradient-to-r from-gray-500 to-gray-700 rounded-t-2xl" />
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    <Shield size={20} className="text-white" />
                  </div>
                  <div className="flex gap-1">
                    {(isSuperAdmin || u.id === currentUser.id) && (
                    <button onClick={() => { setEditing(u); setShowModal(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="تعديل"><Edit2 size={13} /></button>
                    )}
                    <button onClick={() => remove(u.id, u.role)} className={`p-1.5 rounded-lg ${u.is_super_admin || !isSuperAdmin ? 'text-gray-200 cursor-not-allowed' : 'text-red-400 hover:bg-red-50'}`} title={u.is_super_admin ? 'لا يمكن حذف المدير السوبر' : !isSuperAdmin ? 'فقط المدير السوبر يمكنه الحذف' : 'حذف'}><Trash2 size={13} /></button>
                  </div>
                </div>
                <p className="font-bold text-gray-800 text-sm">{u.name}</p>
                <p className="text-xs text-gray-500 mb-2">@{u.username}</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${roleColors[u.role] || 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.status === 'active' ? 'نشط' : 'غير نشط'}</span>
                </div>
                {(isSuperAdmin || u.id === currentUser.id) && (
                  <button onClick={() => setPasswordUser(u)} className="flex items-center gap-1.5 w-full justify-center border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
                    <Lock size={12} /> تغيير كلمة المرور
                  </button>
                )}
                {isSuperAdmin && !u.is_super_admin && (
                  <button onClick={() => resetPassword(u)} className="flex items-center gap-1.5 w-full justify-center border border-amber-200 hover:bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-2 rounded-xl transition-colors mt-2">
                    <Lock size={12} /> إعادة تعيين كلمة المرور
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center gap-3">
        <button onClick={() => { setEditing(undefined); setShowModal(true); }} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm">
          <Plus size={16} /> إضافة مستخدم جديد
        </button>
        <button onClick={() => setShowRolesManager(true)} className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm">
          <BookMarked size={16} /> إدارة الأدوار المخصصة
        </button>
      </div>
    </div>
  );
}
