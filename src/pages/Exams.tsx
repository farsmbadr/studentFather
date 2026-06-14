import { useState, useEffect } from 'react';
import { Plus, FileText, Edit2, Trash2, Users, X, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ListTemplate from '../components/ListTemplate';
import { useToast } from '../components/Toast';
import { printHeaderHtml, printFooterHtml, printHeaderStyle } from '../utils/printHeader';
import { Page } from '../types';

export default function Exams({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const { show, confirm } = useToast();
  const [exams, setExams] = useState<any[]>([]);
  const [examCounts, setExamCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [centerName, setCenterName] = useState('CenterMasr');
  const [centerAddress, setCenterAddress] = useState('');
  const [centerPhone, setCenterPhone] = useState('');
  const [centerLogo, setCenterLogo] = useState('');

  const [scoreModal, setScoreModal] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [scoreGroup, setScoreGroup] = useState('');
  const [examResults, setExamResults] = useState<any[]>([]);
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [savingScores, setSavingScores] = useState(false);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [allGrades, setAllGrades] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    const [examData, resultsData, studData, cfg, subRes, grdRes] = await Promise.all([
      supabase.from('exams').select('*').order('date', { ascending: false }),
      supabase.from('exam_results').select('exam_title'),
      supabase.from('students').select('*').eq('status', 'active'),
      supabase.from('center_config').select('center_name,address,phone,logo').maybeSingle(),
      supabase.from('subjects').select('name').order('name'),
      supabase.from('grades').select('name').order('name'),
    ]);
    if (cfg?.data) { setCenterName(cfg.data.center_name || 'CenterMasr'); setCenterAddress(cfg.data.address || ''); setCenterPhone(cfg.data.phone || ''); setCenterLogo(cfg.data.logo || ''); }
    const counts: Record<string, number> = {};
    for (const r of resultsData?.data || []) {
      counts[r.exam_title] = (counts[r.exam_title] || 0) + 1;
    }
    setExams(examData?.data || []);
    setExamCounts(counts);
    setStudents(studData?.data || []);
    setAllSubjects((subRes?.data || []).map((s: any) => s.name));
    setAllGrades((grdRes?.data || []).map((g: any) => g.name));
    const groups = [...new Set((studData?.data || []).map((s: any) => s.group_name).filter(Boolean))] as string[];
    setAllGroups(groups);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    const ok = await confirm('حذف هذا الاختبار؟');
    if (!ok) return;
    await supabase.from('exams').delete().eq('id', id);
    show('تم حذف الاختبار');
    load();
  };

  const filtered = exams.filter(e => {
    if (filterSubject && e.subject !== filterSubject) return false;
    if (filterGrade && e.grade !== filterGrade) return false;
    return e.title.includes(search) || e.subject.includes(search) || e.grade.includes(search);
  });

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return show('الرجاء السماح بالنوافذ المنبثقة', 'error');
    const rows = filtered.map((e, i) => {
      const c = examCounts[e.title] || 0;
      const typeLabel = e.exam_type === 'إلكتروني' ? 'إلكتروني' : 'ورقي';
      return `<tr>
        <td>${i + 1}</td>
        <td style="font-weight:bold">${e.title}</td>
        <td>${e.subject || '—'}</td>
        <td>${e.grade || '—'}</td>
        <td>${typeLabel}</td>
        <td style="font-weight:bold;color:#2563eb">${e.max_score}</td>
        <td style="direction:ltr;text-align:left">${new Date(e.date).toLocaleString('ar-EG')}</td>
        <td>${c > 0 ? c + ' طالب' : '—'}</td>
      </tr>`;
    }).join('');
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>قائمة الاختبارات</title>
      <style>
        @page { size: A4 portrait; margin: 18mm 8mm 14mm; }
        * { font-family: 'Traditional Arabic', 'Arabic Typesetting', Arial, sans-serif; }
        body { margin: 0; padding: 0; }
        ${printHeaderStyle()}
        .content { padding: 6mm 5mm; }
        h2 { text-align: center; font-size: 16pt; color: #1e3a5f; margin: 0 0 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 12pt; }
        th { background: #1e3a5f; color: white; padding: 5px 6px; text-align: center; font-weight: bold; }
        td { padding: 4px 6px; border-bottom: 1px solid #ddd; text-align: center; }
        tr:nth-child(even) td { background: #f8f9fa; }
      </style></head><body>
      ${printHeaderHtml({ center_name: centerName, address: centerAddress, phone: centerPhone, logo: centerLogo })}
      <div class="content">
      <h2>قائمة الاختبارات</h2>
      <table>
        <thead><tr><th>#</th><th>عنوان الاختبار</th><th>المادة</th><th>الصف</th><th>النوع</th><th>الدرجة</th><th>التاريخ</th><th>المشاركون</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      </div>
      ${printFooterHtml()}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); w.close(); }, 500);
  };

  return (
    <div className="fade-in space-y-4">
      <ListTemplate
        title="قائمة الاختبارات"
        data={filtered}
        keyExtractor={e => e.id}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث بعنوان الاختبار أو المادة أو المرحلة..."
        loading={loading}
        emptyMessage="لا توجد اختبارات مسجلة"
        emptyIcon={<FileText size={40} className="mx-auto text-gray-300" />}
        onAdd={() => onNavigate?.('exam-add')}
        onExport={() => {}}
        onPrint={handlePrint}
        onRefresh={load}
        filters={<><select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 min-w-[120px]">
          <option value="">كل المواد</option>
          {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 min-w-[120px]">
          <option value="">كل الصفوف</option>
          {allGrades.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        {(filterSubject || filterGrade) && (
          <button onClick={() => { setFilterSubject(''); setFilterGrade(''); }}
            className="text-xs text-gray-400 hover:text-gray-600">إعادة تعيين</button>
        )}</>}
        columns={[
          { key: 'exam_type', label: 'النوع', render: e => <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.exam_type === 'إلكتروني' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>{e.exam_type === 'ورقة' ? 'ورقي' : e.exam_type}</span> },
          { key: 'title', label: 'عنوان الاختبار', render: e => <span className="font-semibold text-gray-800">{e.title}</span> },
          { key: 'subject', label: 'المادة', render: e => <span className="text-gray-600">{e.subject}</span> },
          { key: 'grade', label: 'الصف الدراسي', render: e => <span className="text-gray-600">{e.grade}</span> },
          { key: 'max_score', label: 'الدرجة الكاملة', render: e => <span className="font-bold text-blue-600">{e.max_score}</span> },
          { key: 'date', label: 'التاريخ', render: e => <span className="text-gray-600">{new Date(e.date).toLocaleString('ar-EG')}</span> },
          { key: 'entries', label: 'دخل الامتحان', render: e => {
            const c = examCounts[e.title] || 0;
            return <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${c > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'}`}><Users size={13} />{c}</span>;
          }},
          {
            key: 'actions', label: 'إجراءات', sortable: false, render: e => (
              <div className="flex items-center gap-2">
                {e.exam_type === 'إلكتروني' && (
                  <button onClick={() => { localStorage.setItem('exam-setup-id', e.id); onNavigate?.('exam-setup'); }}
                    className="text-violet-500 hover:text-violet-700 p-1.5 rounded-lg hover:bg-violet-50 transition-colors" title="إعداد الاختبار">
                    <Edit2 size={15} />
                  </button>
                )}
                <button onClick={async () => {
                  setScoreModal(e); setScoreGroup(''); setScoreInputs({});
                  const { data } = await supabase.from('exam_results').select('*').eq('exam_title', e.title);
                  setExamResults(data || []);
                }} className="text-emerald-500 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors" title="إدخال الدرجات">
                  <CheckCircle size={15} />
                </button>
                <button onClick={() => { localStorage.setItem('exam-edit', JSON.stringify(e)); onNavigate?.('exam-add'); }} className="text-blue-500 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                  <Edit2 size={15} />
                </button>
                <button onClick={() => remove(e.id)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-100 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            )
          },
        ]}
      />
      {/* Score Entry Modal */}
      {scoreModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setScoreModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-800">إدخال الدرجات</h3>
              <button onClick={() => setScoreModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="px-4 py-2 border-b bg-gray-50">
              <p className="text-sm font-semibold text-gray-700">{scoreModal.title} <span className="text-gray-400 font-normal">— {scoreModal.subject}</span></p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <select value={scoreGroup} onChange={e => { setScoreGroup(e.target.value); setScoreInputs({}); }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                  <option value="">كل المجموعات</option>
                  {allGroups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <span className="text-xs text-gray-400">
                  {(() => {
                    const filtered = students.filter(s => !scoreGroup || s.group_name === scoreGroup);
                    return `عرض ${filtered.length} طالب`;
                  })()}
                </span>
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  {examResults.length} نتيجة محفوظة
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="text-gray-500 text-xs border-b">
                      <th className="text-right py-2 px-2">#</th>
                      <th className="text-right py-2 px-2">الطالب</th>
                      <th className="text-right py-2 px-2">المجموعة</th>
                      <th className="text-center py-2 px-2 w-28">الدرجة (من {scoreModal.max_score})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.filter(s => !scoreGroup || s.group_name === scoreGroup).map((s, i) => {
                      const existing = examResults.find(er => er.student_id === s.id);
                      const val = scoreInputs[s.id] ?? (existing ? String(existing.score) : '');
                      return (
                        <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="text-right py-2 px-2 text-gray-400">{i + 1}</td>
                          <td className="py-2 px-2 font-semibold text-gray-800">{s.name}</td>
                          <td className="py-2 px-2 text-gray-500 text-xs">{s.group_name}</td>
                          <td className="text-center py-2 px-2">
                            <input type="text" inputMode="numeric" value={val} onChange={e => setScoreInputs(prev => ({ ...prev, [s.id]: e.target.value.replace(/[^0-9.]/g, '') }))}
                              placeholder="—"
                              className="w-20 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button onClick={async () => {
                  setSavingScores(true);
                  const entries = Object.entries(scoreInputs).filter(([_, v]) => v.trim() !== '');
                  const now = new Date().toISOString();
                  try {
                    for (const [studentId, scoreStr] of entries) {
                      const student = students.find(s => s.id === studentId);
                      const existing = examResults.find(er => er.student_id === studentId);
                      const row = { student_id: studentId, student_name: student?.name || '', exam_title: scoreModal.title, subject: scoreModal.subject, date: scoreModal.date, score: Number(scoreStr), max_score: scoreModal.max_score };
                      if (existing) {
                        await supabase.from('exam_results').update(row).eq('id', existing.id);
                      } else {
                        await supabase.from('exam_results').insert(row);
                      }
                    }
                    show('تم حفظ الدرجات بنجاح', 'success');
                    const { data } = await supabase.from('exam_results').select('*').eq('exam_title', scoreModal.title);
                    setExamResults(data || []);
                    setScoreInputs({});
                    load();
                  } catch { show('حدث خطأ أثناء الحفظ', 'error'); }
                  setSavingScores(false);
                }} disabled={savingScores || !Object.values(scoreInputs).some(v => v.trim())}
                  className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50">
                  {savingScores ? 'جاري الحفظ...' : 'حفظ الدرجات'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
