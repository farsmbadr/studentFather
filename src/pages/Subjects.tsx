import { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit2, Trash2, X, Users, UserCheck, DollarSign, Printer, FileDown, RefreshCw } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import { printHeaderHtml, printFooterHtml, printHeaderStyle } from '../utils/printHeader';

const SUBJECT_ICONS: Record<string, string> = {
  رياضي: '📐', بدني: '🏋️',
  فيزي: '⚡', كيمي: '🧪', بيول: '🧬', علم: '🔬', أحياء: '🌿',
  تاريخ: '📜', جغراف: '🌍', وطني: '🇪🇬', فلسف: '💭', اجتماع: '👥', دراس: '📚',
  دين: '☪️', تربية: '🕌', قرآن: '📖',
  عرب: '📖', لغه: '🔤', نحو: '✍️', بلاغ: '🖋️', أدب: '📝', نصوص: '📃',
  إنجليز: '🇬🇧', انجليز: '🇬🇧', فرنس: '🗼', ألمان: '🇩🇪', المان: '🇩🇪', اسبان: '🇪🇸',
  حاسب: '💻', كمبيوتر: '🖥️', تكنولوج: '🤖', برمج: '👨‍💻',
  اقتصاد: '💰', إحصاء: '📊', مناهج: '📋',
  رسم: '🎨', فن: '🖌️', موسيق: '🎵',
};

const COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316','#14b8a6','#6366f1'];

function subjectMeta(name: string) {
  const match = Object.entries(SUBJECT_ICONS).find(([k]) => name.includes(k));
  const emoji = match ? match[1] : '📘';
  const color = COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  return { emoji, color };
}

export default function Subjects() {
  const { show, confirm } = useToast();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [subjectTeachers, setSubjectTeachers] = useState<Record<string, any[]>>({});
  const [subjectStudents, setSubjectStudents] = useState<Record<string, any[]>>({});
  const [examCountMap, setExamCountMap] = useState<Record<string, number>>({});
  const [groupCountMap, setGroupCountMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [centerName, setCenterName] = useState('CenterMasr');
  const [centerAddress, setCenterAddress] = useState('');
  const [centerPhone, setCenterPhone] = useState('');
  const [centerLogo, setCenterLogo] = useState('');

  // Subject modal
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [formName, setFormName] = useState('');

  // Management modal
  const [manageSubject, setManageSubject] = useState<any>(null);
  const [manageTab, setManageTab] = useState<'teachers' | 'students'>('teachers');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const load = async () => {
    setLoading(true);
    const [subRes, teaRes, stuRes, stRes, ssRes, examRes, gsRes, cfgRes] = await Promise.all([
      supabase.from('subjects').select('*').order('name'),
      supabase.from('teachers').select('*').order('name'),
      supabase.from('students').select('*').order('name'),
      supabase.from('subject_teachers').select('*'),
      supabase.from('subject_students').select('*'),
      supabase.from('exams').select('*'),
      supabase.from('group_subjects').select('*'),
      supabase.from('center_config').select('center_name,address,phone,logo').maybeSingle(),
    ]);
    setSubjects(subRes.data || []);
    setAllTeachers(teaRes.data || []);
    setAllStudents(stuRes.data || []);

    const stMap: Record<string, any[]> = {};
    for (const st of (stRes.data || [])) {
      if (!stMap[st.subject_id]) stMap[st.subject_id] = [];
      const teacher = (teaRes.data || []).find(t => t.id === st.teacher_id);
      stMap[st.subject_id].push({ ...st, teacher_name: teacher?.name || '—' });
    }
    setSubjectTeachers(stMap);

    const ssMap: Record<string, any[]> = {};
    for (const ss of (ssRes.data || [])) {
      if (!ssMap[ss.subject_id]) ssMap[ss.subject_id] = [];
      const student = (stuRes.data || []).find(s => s.id === ss.student_id);
      ssMap[ss.subject_id].push({ ...ss, student_name: student?.name || '—' });
    }
    setSubjectStudents(ssMap);

    const examCounts: Record<string, number> = {};
    for (const ex of (examRes.data || [])) {
      const subjectName = ex.subject?.trim();
      if (subjectName) examCounts[subjectName] = (examCounts[subjectName] || 0) + 1;
    }
    setExamCountMap(examCounts);

    const groupCounts: Record<string, number> = {};
    for (const gs of (gsRes.data || [])) {
      groupCounts[gs.subject_id] = (groupCounts[gs.subject_id] || 0) + 1;
    }
    setGroupCountMap(groupCounts);

    if (cfgRes.data) { setCenterName((cfgRes.data as any).center_name || 'CenterMasr'); setCenterAddress((cfgRes.data as any).address || ''); setCenterPhone((cfgRes.data as any).phone || ''); setCenterLogo((cfgRes.data as any).logo || ''); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAddSubject = () => { setEditingSubject(null); setFormName(''); setShowSubjectModal(true); };
  const openEditSubject = (s: any) => { setEditingSubject(s); setFormName(s.name); setShowSubjectModal(true); };

  const saveSubject = async () => {
    if (!formName.trim()) return;
    const payload: any = { name: formName.trim() };
    try {
      if (editingSubject) await supabase.from('subjects').update(payload).eq('id', editingSubject.id);
      else await supabase.from('subjects').insert(payload);
      show(editingSubject ? 'تم تعديل المادة' : 'تم إضافة المادة', 'success');
      setShowSubjectModal(false);
      load();
    } catch { show('حدث خطأ', 'error'); }
  };

  const removeSubject = async (id: string, name: string) => {
    const ok = await confirm(`حذف المادة "${name}"؟`);
    if (!ok) return;
    await supabase.from('subjects').delete().eq('id', id);
    show('تم حذف المادة');
    load();
  };

  const addTeacher = async () => {
    if (!selectedTeacherId || !manageSubject) return;
    await supabase.from('subject_teachers').insert({ subject_id: manageSubject.id, teacher_id: selectedTeacherId });
    setSelectedTeacherId('');
    load();
  };

  const removeTeacher = async (id: string) => {
    await supabase.from('subject_teachers').delete().eq('id', id);
    load();
  };

  const addStudent = async () => {
    if (!selectedStudentId || !manageSubject) return;
    await supabase.from('subject_students').insert({ subject_id: manageSubject.id, student_id: selectedStudentId });
    setSelectedStudentId('');
    load();
  };

  const removeStudent = async (id: string) => {
    await supabase.from('subject_students').delete().eq('id', id);
    load();
  };

  const filtered = subjects.filter(s => s.name.includes(search));

  // Auto-calculate income from linked students' monthly_fee
  const subjectIncome = (subjectId: string) => {
    const ids = (subjectStudents[subjectId] || []).map(ss => ss.student_id);
    return allStudents.filter(s => ids.includes(s.id)).reduce((sum, s) => sum + (Number(s.monthly_fee) || 0), 0);
  };

  const teachersWithoutSubject = allTeachers.filter(t =>
    !(subjectTeachers[manageSubject?.id] || []).some(st => st.teacher_id === t.id)
  );
  const studentsWithoutSubject = allStudents.filter(s =>
    !(subjectStudents[manageSubject?.id] || []).some(ss => ss.student_id === s.id)
  );

  const handleExport = async () => {
    const XLSX = await import('xlsx');
    const data = filtered.map((s, i) => ({
      '#': i + 1,
      'المادة': s.name,
      'المعلمون': (subjectTeachers[s.id] || []).map(st => st.teacher_name).join(' - '),
      'الطلاب': (subjectStudents[s.id] || []).length,
      'المجموعات': groupCountMap[s.id] || 0,
      'الاختبارات': examCountMap[s.name] || 0,
      'الإيراد': subjectIncome(s.id),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المواد');
    XLSX.writeFile(wb, 'المواد.xlsx');
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = filtered.map((s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td style="font-weight:bold">${s.name}</td>
        <td>${(subjectTeachers[s.id] || []).map(st => st.teacher_name).join(' - ')}</td>
        <td>${(subjectStudents[s.id] || []).length}</td>
        <td>${groupCountMap[s.id] || 0}</td>
        <td>${examCountMap[s.name] || 0}</td>
        <td>${subjectIncome(s.id)} ج</td>
      </tr>`).join('');
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>المواد</title>
      <style>
        @page { margin: 14mm 3mm 10mm; }
        * { font-family: 'Traditional Arabic', 'Arabic Typesetting', Arial, sans-serif; }
        body { margin: 0; padding: 0; }
        ${printHeaderStyle()}
        .content { padding: 8mm 3mm 6mm; }
        h2 { text-align: center; font-size: 14pt; color: #1e3a5f; margin: 0 0 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 12pt; }
        th { background: #1e3a5f; color: white; padding: 5px 3px; text-align: center; font-weight: bold; }
        td { padding: 3px 3px; border-bottom: 1px solid #ddd; text-align: center; }
        tr:nth-child(even) { background: #f8f9fa; }
      </style></head><body>
      ${printHeaderHtml({ center_name: centerName, address: centerAddress, phone: centerPhone, logo: centerLogo })}
      <div class="content">
      <h2>المواد</h2>
      <table>
        <thead><tr><th>#</th><th>المادة</th><th>المعلمون</th><th>الطلاب</th><th>المجموعات</th><th>الاختبارات</th><th>الإيراد</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      </div>
      ${printFooterHtml()}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); w.close(); }, 500);
  };

  return (
    <div className="fade-in space-y-4">
      {/* Subject Add/Edit Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSubjectModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-800">{editingSubject ? 'تعديل المادة' : 'إضافة مادة جديدة'}</h3>
              <button onClick={() => setShowSubjectModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block font-semibold">اسم المادة <span className="text-red-500">*</span></label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
                  placeholder="مثال: الرياضيات"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="flex gap-3 justify-end p-5 border-t">
              <button onClick={() => setShowSubjectModal(false)} className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
              <button onClick={saveSubject} disabled={!formName.trim()}
                className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-50">
                {editingSubject ? 'تحديث' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Management Modal */}
      {manageSubject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setManageSubject(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <span className="text-xl">{subjectMeta(manageSubject.name).emoji}</span>
                {manageSubject.name}
              </h3>
              <button onClick={() => setManageSubject(null)}><X size={20} className="text-gray-400" /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              {([
                { key: 'teachers', label: 'المعلمون', icon: <UserCheck size={14} /> },
                { key: 'students', label: 'الطلاب', icon: <Users size={14} /> },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setManageTab(t.key)}
                  className={`flex items-center gap-1.5 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${manageTab === t.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <div className="p-5 max-h-80 overflow-y-auto">
              {manageTab === 'teachers' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <select value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="">اختر معلم...</option>
                      {teachersWithoutSubject.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <button onClick={addTeacher} disabled={!selectedTeacherId}
                      className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50">إضافة</button>
                  </div>
                  {(subjectTeachers[manageSubject.id] || []).length === 0 ? (
                    <p className="text-gray-300 text-sm text-center py-8">لا يوجد معلمون لهذه المادة</p>
                  ) : (
                    <div className="space-y-2">
                      {(subjectTeachers[manageSubject.id] || []).map(st => (
                        <div key={st.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{st.teacher_name[0]}</div>
                            <span className="text-sm font-semibold text-gray-700">{st.teacher_name}</span>
                          </div>
                          <button onClick={() => removeTeacher(st.id)} className="text-red-400 hover:text-red-600 p-1"><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {manageTab === 'students' && (
                <div className="space-y-3">
                  {/* Income summary */}
                  <div className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-2.5">
                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <DollarSign size={14} className="text-green-500" /> إجمالي الإيراد الشهري
                    </span>
                    <span className="text-sm font-bold text-green-600">{subjectIncome(manageSubject.id).toLocaleString()} ج</span>
                  </div>
                  <div className="flex gap-2">
                    <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="">اختر طالب...</option>
                      {studentsWithoutSubject.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button onClick={addStudent} disabled={!selectedStudentId}
                      className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50">إضافة</button>
                  </div>
                  {(subjectStudents[manageSubject.id] || []).length === 0 ? (
                    <p className="text-gray-300 text-sm text-center py-8">لا يوجد طلاب لهذه المادة</p>
                  ) : (
                    <div className="space-y-2">
                      {(subjectStudents[manageSubject.id] || []).map(ss => (
                        <div key={ss.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">{ss.student_name[0]}</div>
                            <span className="text-sm font-semibold text-gray-700">{ss.student_name}</span>
                          </div>
                          <button onClick={() => removeStudent(ss.id)} className="text-red-400 hover:text-red-600 p-1"><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <BookOpen size={20} className="text-blue-500" /> المواد
        </h2>
        <div className="flex items-center gap-2 no-print">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث..."
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-44" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 justify-end no-print">
        <button onClick={handleExport} className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2.5 rounded-xl font-semibold transition-colors">
          <FileDown size={16} /> تصدير إكسيل
        </button>
        <button onClick={handlePrint} className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2.5 rounded-xl font-semibold transition-colors">
          <Printer size={16} /> طباعة
        </button>
        <button onClick={load} className="flex items-center gap-1.5 bg-gray-500 hover:bg-gray-600 text-white text-sm px-4 py-2.5 rounded-xl font-semibold transition-colors">
          <RefreshCw size={16} /> تحديث
        </button>
        <button onClick={openAddSubject} className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2.5 rounded-xl font-semibold transition-colors">
          <Plus size={16} /> إضافة مادة
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center text-gray-400 py-16">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-300 py-16">
          <BookOpen size={40} className="mx-auto mb-3 opacity-50" />
          {search ? 'لا توجد مواد مطابقة للبحث' : 'لا توجد مواد مسجلة بعد'}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs border-b">
                  <th className="text-right py-3 px-4 w-14">#</th>
                  <th className="text-right py-3 px-4">المادة</th>
                  <th className="text-center py-3 px-4">المعلمون</th>
                  <th className="text-center py-3 px-4">الطلاب</th>
                  <th className="text-center py-3 px-4">المجموعات</th>
                  <th className="text-center py-3 px-4">الاختبارات</th>
                  <th className="text-center py-3 px-4">الإيراد</th>
                  <th className="text-center py-3 px-4 w-28">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const { emoji, color } = subjectMeta(s.name);
                  const teachers = subjectTeachers[s.id] || [];
                  const students = subjectStudents[s.id] || [];
                  return (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="text-right py-3 px-4 text-gray-400">{i + 1}</td>
                      <td className="py-3 px-4">
                        <button onClick={() => { setManageSubject(s); setManageTab('teachers'); }}
                          className="flex items-center gap-3 hover:text-blue-600 transition-colors text-right w-full">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm shrink-0"
                            style={{ backgroundColor: color + '18' }}>{emoji}</div>
                          <span className="font-semibold text-gray-800">{s.name}</span>
                        </button>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {teachers.slice(0, 2).map((st: any) => (
                            <span key={st.id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-xs rounded-full px-2.5 py-0.5 font-medium">
                              {st.teacher_name}
                            </span>
                          ))}
                          {teachers.length > 2 && (
                            <span className="text-xs text-gray-400">+{teachers.length - 2}</span>
                          )}
                          {teachers.length === 0 && <span className="text-gray-300 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <button onClick={() => { setManageSubject(s); setManageTab('students'); }}
                          className="text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors">
                          {students.length} طالب
                        </button>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-xs font-semibold text-gray-500">{groupCountMap[s.id] || 0}</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-xs font-semibold text-gray-500">{examCountMap[s.name] || 0}</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <button onClick={() => { setManageSubject(s); setManageTab('students'); }}
                          className="text-xs font-semibold text-green-600 hover:text-green-700 transition-colors">
                          {subjectIncome(s.id) > 0 ? `${subjectIncome(s.id).toLocaleString()} ج` : '—'}
                        </button>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditSubject(s)}
                            className="p-1.5 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="تعديل">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => removeSubject(s.id, s.name)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="حذف">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
