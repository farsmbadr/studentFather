import { useState, useEffect } from 'react';
import { ArrowRight, Link, Copy, Check, Shuffle, Plus, Trash2, Edit2, Save, BookOpen, Clock, Users, GraduationCap, X, ChevronDown, ChevronUp, HelpCircle, AlertCircle, Sparkles, ListChecks } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';

const DIFFICULTY_COLORS: Record<string, string> = {
  سهل: 'bg-emerald-100 text-emerald-700',
  متوسط: 'bg-amber-100 text-amber-700',
  صعب: 'bg-red-100 text-red-700',
};
const TYPE_ICONS: Record<string, string> = { 'اختيار من متعدد': '🔘', 'صح/خطأ': '✅', مقالي: '📝' };

export default function ExamSetup({ examId, onBack }: { examId: string; onBack: () => void }) {
  const { show } = useToast();

  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [allGrades, setAllGrades] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [questionCount, setQuestionCount] = useState(10);
  const [closingDate, setClosingDate] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedStage, setSelectedStage] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [editQuestionId, setEditQuestionId] = useState<string | null>(null);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState('اختيار من متعدد');
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState('');
  const [qDifficulty, setQDifficulty] = useState('متوسط');

  const [copied, setCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Mode
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const [autoEasy, setAutoEasy] = useState(5);
  const [autoMedium, setAutoMedium] = useState(5);
  const [autoHard, setAutoHard] = useState(5);

  const load = async () => {
    setLoading(true);
    const [examRes, qRes, eqRes, subRes, grpRes, grdRes] = await Promise.all([
      supabase.from('exams').select('*').eq('id', examId).maybeSingle(),
      supabase.from('questions').select('*').order('created_at', { ascending: false }),
      supabase.from('exam_questions').select('*').eq('exam_id', examId),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('groups').select('name'),
      supabase.from('grades').select('name').order('name'),
    ]);
    setExam(examRes.data);
    setQuestions(qRes.data || []);
    setExamQuestions(eqRes.data || []);
    setAllSubjects(subRes.data || []);
    setAllGrades((grdRes.data || []).map((g: any) => g.name));
    const gnames = [...new Set((grpRes.data || []).map((g: any) => g.name))] as string[];
    setAllGroups(gnames.sort((a, b) => a.localeCompare(b, 'ar')));
    if (examRes.data) {
      setClosingDate(examRes.data.closing_date ? examRes.data.closing_date.slice(0, 16) : '');
      setSelectedGroup(examRes.data.group_name || '');
      setSelectedStage(examRes.data.stage || '');
      setQuestionCount(examRes.data.question_count || 10);
      setMode(examRes.data.selection_mode || 'manual');
      const ac = examRes.data.auto_config || {};
      setAutoEasy(ac.easy ?? 5);
      setAutoMedium(ac.medium ?? 5);
      setAutoHard(ac.hard ?? 5);
    }
    setSelectedIds((eqRes.data || []).map((e: any) => e.question_id));
    setLoading(false);
  };

  useEffect(() => { load(); }, [examId]);

  const subject = exam ? allSubjects.find(s => s.name === exam.subject) || allSubjects.find(s => s.id === exam.subject) : null;
  const subjectId = subject?.id || exam?.subject;
  const subjectName = subject?.name || exam?.subject || '';
  const filteredQuestions = questions.filter(q => q.subject_id === subjectId);
  const examLink = exam?.exam_link || `${window.location.origin}/take-exam/${examId}`;
  const bankCount = filteredQuestions.length;
  const selectedCount = selectedIds.length;
  const levelOrder: Record<string, number> = { ابتدائي: 0, إعدادي: 1, ثانوي: 2 };
  const gradeNum: Record<string, number> = { الأول: 1, الثاني: 2, الثالث: 3, الرابع: 4, الخامس: 5, السادس: 6 };
  const stages = [...new Set([...allSubjects.filter(s => s.stage).map(s => s.stage), ...allGrades])].sort((a, b) => {
    const partsA = a.split(' ');
    const partsB = b.split(' ');
    const levelA = partsA[1] || '';
    const levelB = partsB[1] || '';
    const lDiff = (levelOrder[levelA] ?? 99) - (levelOrder[levelB] ?? 99);
    if (lDiff !== 0) return lDiff;
    return (gradeNum[partsA[0]] ?? 99) - (gradeNum[partsB[0]] ?? 99);
  });

  const bankEasy = filteredQuestions.filter(q => q.difficulty === 'سهل').length;
  const bankMedium = filteredQuestions.filter(q => q.difficulty === 'متوسط').length;
  const bankHard = filteredQuestions.filter(q => q.difficulty === 'صعب').length;
  const autoTotal = autoEasy + autoMedium + autoHard;
  const canAuto = autoEasy <= bankEasy && autoMedium <= bankMedium && autoHard <= bankHard && autoTotal > 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(examLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { show('تعذر النسخ', 'error'); }
  };

  const resetForm = () => {
    setQText(''); setQType('اختيار من متعدد'); setQOptions(['', '', '', '']);
    setQCorrect(''); setQDifficulty('متوسط'); setEditQuestionId(null); setShowAddForm(false);
  };

  const saveQuestion = async () => {
    if (!qText.trim()) return show('نص السؤال مطلوب', 'error');
    if ((qType === 'اختيار من متعدد' || qType === 'صح/خطأ') && !qCorrect.trim()) return show('الإجابة الصحيحة مطلوبة', 'error');
    const payload: any = {
      subject_id: subjectId || null,
      question_text: qText.trim(),
      options: qType === 'صح/خطأ' ? ['صح', 'خطأ'] : qType === 'اختيار من متعدد' ? qOptions.filter(o => o.trim()) : [],
      correct_answer: qCorrect.trim(),
      question_type: qType,
      difficulty: qDifficulty,
    };
    try {
      if (editQuestionId) await supabase.from('questions').update(payload).eq('id', editQuestionId);
      else await supabase.from('questions').insert(payload);
      show(editQuestionId ? 'تم تعديل السؤال' : 'تم إضافة السؤال', 'success');
      resetForm();
      load();
    } catch { show('حدث خطأ', 'error'); }
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from('questions').delete().eq('id', id);
    show('تم حذف السؤال');
    load();
  };

  const toggleQuestion = (qId: string) => {
    setSelectedIds(prev => prev.includes(qId) ? prev.filter(x => x !== qId) : [...prev, qId]);
  };

  const saveExamSetup = async () => {
    if (mode === 'manual') {
      const currentIds = examQuestions.map(eq => eq.question_id);
      const toAdd = selectedIds.filter(id => !currentIds.includes(id));
      const toRemove = examQuestions.filter(eq => !selectedIds.includes(eq.question_id));
      for (const qId of toAdd) await supabase.from('exam_questions').insert({ exam_id: examId, question_id: qId, order_number: 0 });
      for (const eq of toRemove) await supabase.from('exam_questions').delete().eq('id', eq.id);
    } else {
      if (!canAuto) return show('عدد الأسئلة المطلوبة يتجاوز المتاح في بنك الأسئلة', 'error');
      const currentIds = examQuestions.map(eq => eq.question_id);
      for (const id of currentIds) await supabase.from('exam_questions').delete().eq('id', id);
    }
    await supabase.from('exams').update({
      exam_link: examLink,
      closing_date: closingDate ? new Date(closingDate).toISOString() : null,
      question_count: mode === 'manual' ? selectedCount : autoTotal,
      group_name: selectedGroup,
      stage: selectedStage,
      selection_mode: mode,
      auto_config: mode === 'auto' ? { easy: autoEasy, medium: autoMedium, hard: autoHard } : {},
    }).eq('id', examId);
    show('تم حفظ إعدادات الاختبار', 'success');
    load();
  };

  const randomizeQuestions = () => {
    const shuffled = [...selectedIds].sort(() => Math.random() - 0.5);
    setSelectedIds(shuffled);
    show('تم ترتيب الأسئلة عشوائياً', 'success');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" /></div>;
  if (!exam) return <div className="text-center text-gray-400 py-16">الاختبار غير موجود</div>;

  return (
    <div className="fade-in space-y-4">
      {/* Top bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><ArrowRight size={20} /></button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-violet-200"><BookOpen size={18} /></div>
          <div>
            <h2 className="font-bold text-gray-800">{exam.title}</h2>
            <p className="text-xs text-gray-400">{exam.exam_type} · {subjectName} · {exam.grade}</p>
          </div>
        </div>
        <button onClick={saveExamSetup} className="flex items-center gap-2 bg-gradient-to-l from-violet-500 to-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-violet-200 hover:from-violet-600 hover:to-purple-700 transition-all">
          <Save size={16} /> حفظ الإعدادات
        </button>
      </div>

      {/* Mode selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-gray-500">طريقة اختيار الأسئلة:</span>
          <button onClick={() => setMode('manual')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${mode === 'manual' ? 'bg-violet-100 text-violet-700 shadow-sm' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
            <ListChecks size={15} /> اختيار يدوي
          </button>
          <button onClick={() => setMode('auto')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${mode === 'auto' ? 'bg-violet-100 text-violet-700 shadow-sm' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
            <Sparkles size={15} /> تلقائي حسب المستوى
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 mr-1">
          {mode === 'manual' ? 'اختر أنت الأسئلة من بنك الأسئلة. ترتيب الأسئلة عشوائي لكل طالب.' :
           'حدد عدد الأسئلة حسب المستوى وسيتم اختيار أسئلة مختلفة عشوائياً لكل طالب.'}
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Right column - Settings sidebar */}
        <div className="lg:col-span-1 order-2 lg:order-2 space-y-4">
          {/* Exam link */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1.5"><Link size={14} /> رابط الاختبار</h3>
            <div className="flex items-center gap-2">
              <input type="text" value={examLink} readOnly className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-600 font-mono focus:outline-none" />
              <button onClick={handleCopy} className={`p-2 rounded-xl transition-colors ${copied ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Question counts */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1.5"><HelpCircle size={14} /> عدد الأسئلة</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl px-4 py-3 text-center border border-violet-100">
                <div className="text-2xl font-bold text-violet-600">{bankCount}</div>
                <div className="text-[10px] text-violet-500 font-medium mt-0.5">في بنك الأسئلة</div>
              </div>
              <div className="text-gray-300 text-lg font-bold">→</div>
              <div className="flex-1 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl px-4 py-3 text-center border border-emerald-100">
                <div className="text-2xl font-bold text-emerald-600">{mode === 'manual' ? selectedCount : autoTotal}</div>
                <div className="text-[10px] text-emerald-500 font-medium mt-0.5">للاختبار</div>
              </div>
            </div>
          </div>

          {/* Closing date */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1.5"><Clock size={14} /> موعد الغلق</h3>
            <input type="datetime-local" value={closingDate} onChange={e => setClosingDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>

          {/* Stage + Group */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
            <h3 className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1.5"><GraduationCap size={14} /> التصفية</h3>
            <div>
              <label className="text-[10px] text-gray-400 font-medium mb-1 block">الصف</label>
              <select value={selectedStage} onChange={e => setSelectedStage(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                <option value="">كل الصفوف</option>
                {stages.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-medium mb-1 block">المجموعة</label>
              <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                <option value="">كل المجموعات</option>
                {allGroups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* Auto difficulty config */}
          {mode === 'auto' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><Sparkles size={14} /> توزيع المستويات</h3>
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <span>المتاح: {bankEasy} سهل · {bankMedium} متوسط · {bankHard} صعب</span>
              </div>
              {[
                { label: 'سهل', val: autoEasy, set: setAutoEasy, color: 'emerald', max: bankEasy },
                { label: 'متوسط', val: autoMedium, set: setAutoMedium, color: 'amber', max: bankMedium },
                { label: 'صعب', val: autoHard, set: setAutoHard, color: 'red', max: bankHard },
              ].map(({ label, val, set, color, max }) => (
                <div key={label}>
                  <label className={`text-[10px] font-medium mb-1 block text-${color}-600`}>{label} (المتاح {max})</label>
                  <input type="number" min={0} max={max} value={val} onChange={e => set(Math.min(max, Math.max(0, +e.target.value)))}
                    className={`w-full border border-${color}-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-${color}-400`} />
                  {val > max && <p className="text-[10px] text-red-500 mt-0.5">يتجاوز المتاح!</p>}
                </div>
              ))}
              <div className={`text-xs font-bold pt-1 ${autoTotal > 0 ? 'text-violet-600' : 'text-gray-400'}`}>
                المجموع: {autoTotal} سؤال
              </div>
              {!canAuto && autoTotal > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-red-500 bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle size={12} /> عدد الأسئلة المطلوبة يتجاوز المتاح في بنك الأسئلة
                </div>
              )}
            </div>
          )}

          {/* Randomize (manual only) */}
          {mode === 'manual' && (
            <button onClick={randomizeQuestions} disabled={selectedCount < 2}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-l from-amber-400 to-orange-500 text-white rounded-xl px-5 py-3 text-sm font-bold shadow-md shadow-amber-200 hover:from-amber-500 hover:to-orange-600 transition-all disabled:opacity-50">
              <Shuffle size={18} /> ترتيب الأسئلة عشوائياً
            </button>
          )}
        </div>

        {/* Left column - Questions */}
        <div className="lg:col-span-2 order-1 lg:order-1 space-y-4">
          {/* Add question button */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {!showAddForm ? (
              <div className="p-4">
                <button onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-4 text-sm text-gray-400 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50 transition-all font-medium">
                  <Plus size={18} /> إضافة سؤال جديد
                </button>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-gray-500 flex items-center gap-1.5">{editQuestionId ? 'تعديل السؤال' : 'إضافة سؤال جديد'}</h3>
                  <button onClick={resetForm} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
                </div>
                <textarea value={qText} onChange={e => setQText(e.target.value)} rows={2} placeholder="اكتب نص السؤال..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 font-medium mb-1 block">النوع</label>
                    <select value={qType} onChange={e => { setQType(e.target.value); setQOptions(e.target.value === 'صح/خطأ' ? ['صح', 'خطأ'] : e.target.value === 'اختيار من متعدد' ? ['', '', '', ''] : []); setQCorrect(''); }}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                      {['اختيار من متعدد', 'صح/خطأ', 'مقالي'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-medium mb-1 block">المستوى</label>
                    <select value={qDifficulty} onChange={e => setQDifficulty(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                      {['سهل', 'متوسط', 'صعب'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-medium mb-1 block">الإجابة الصحيحة</label>
                    {qType === 'مقالي' ? (
                      <input type="text" value={qCorrect} onChange={e => setQCorrect(e.target.value)} placeholder="نموذج الإجابة"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                    ) : (
                      <select value={qCorrect} onChange={e => setQCorrect(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                        <option value="">اختر الإجابة</option>
                        {(qType === 'صح/خطأ' ? ['صح', 'خطأ'] : qOptions.filter(o => o.trim())).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                  </div>
                </div>
                {qType === 'اختيار من متعدد' && (
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-400 font-medium block">الخيارات</label>
                    {qOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-5">{'ABCD'[i]}</span>
                        <input type="text" value={opt} onChange={e => { const n = [...qOptions]; n[i] = e.target.value; setQOptions(n); }}
                          placeholder={`الخيار ${'ABCD'[i]}`}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                        {qOptions.length > 2 && (
                          <button onClick={() => setQOptions(qOptions.filter((_, j) => j !== i))} className="p-1 text-red-300 hover:text-red-500"><X size={14} /></button>
                        )}
                      </div>
                    ))}
                    {qOptions.length < 6 && (
                      <button onClick={() => setQOptions([...qOptions, ''])} className="text-xs text-violet-500 hover:text-violet-700 font-medium">+ إضافة خيار</button>
                    )}
                  </div>
                )}
                <div className="flex gap-2 justify-end pt-1">
                  <button onClick={resetForm} className="px-4 py-2 border border-gray-200 rounded-xl text-xs text-gray-500 hover:bg-gray-50">إلغاء</button>
                  <button onClick={saveQuestion} disabled={!qText.trim()}
                    className="px-5 py-2 bg-gradient-to-l from-violet-500 to-purple-600 text-white rounded-xl text-xs font-bold hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 shadow-md shadow-violet-200">
                    {editQuestionId ? 'تحديث' : 'إضافة'} السؤال
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Question list */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                <HelpCircle size={14} /> بنك الأسئلة
                {bankCount > 0 && <span className="bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full text-[10px]">{bankCount}</span>}
              </h3>
              <span className="text-[10px] text-gray-400">{mode === 'manual' ? 'اضغط على السؤال لإضافته/إزالته من الاختبار' : 'الأسئلة المتاحة في البنك'}</span>
            </div>
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-12 text-gray-300">
                <HelpCircle size={36} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد أسئلة في بنك الأسئلة</p>
                <p className="text-xs mt-1">أضف أسئلة جديدة للبدء</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredQuestions.map((q, i) => {
                  const isSelected = selectedIds.includes(q.id);
                  const isExpanded = expandedId === q.id;
                  return (
                    <div key={q.id} className={`transition-colors ${isSelected && mode === 'manual' ? 'bg-violet-50/30' : ''}`}>
                      <div className="flex items-start gap-3 px-5 py-3.5">
                        {mode === 'manual' && (
                          <button onClick={() => toggleQuestion(q.id)}
                            className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-violet-600 border-violet-600' : 'border-gray-300 hover:border-violet-400'}`}>
                            {isSelected && <Check size={12} className="text-white" />}
                          </button>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] text-gray-400 font-mono">#{i + 1}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[q.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                              {TYPE_ICONS[q.question_type] || '🔘'} {q.difficulty}
                            </span>
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{q.question_type}</span>
                          </div>
                          <p className={`text-sm ${isSelected && mode === 'manual' ? 'text-violet-900 font-medium' : 'text-gray-700'}`}>{q.question_text}</p>
                          {isExpanded && (
                            <div className="mt-2 space-y-1.5 pr-2">
                              {q.question_type === 'اختيار من متعدد' && Array.isArray(q.options) && q.options.map((o: string, oi: number) => (
                                <div key={oi} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${o === q.correct_answer ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-50 text-gray-600'}`}>
                                  <span className="w-4 text-gray-400">{'ABCD'[oi]}</span>
                                  <span>{o}</span>
                                  {o === q.correct_answer && <Check size={12} className="text-emerald-500 mr-auto" />}
                                </div>
                              ))}
                              {q.question_type === 'صح/خطأ' && (
                                <div className="flex gap-2 text-xs">
                                  <div className={`px-3 py-1.5 rounded-lg ${q.correct_answer === 'صح' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold' : 'bg-gray-50 text-gray-500'}`}>✅ صح</div>
                                  <div className={`px-3 py-1.5 rounded-lg ${q.correct_answer === 'خطأ' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold' : 'bg-gray-50 text-gray-500'}`}>❌ خطأ</div>
                                </div>
                              )}
                              {q.question_type === 'مقالي' && q.correct_answer && (
                                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                                  <span className="text-gray-400">نموذج الإجابة: </span>{q.correct_answer}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => { setExpandedId(isExpanded ? null : q.id); }}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <button onClick={() => { setEditQuestionId(q.id); setQText(q.question_text); setQType(q.question_type); setQOptions(Array.isArray(q.options) ? q.options : ['', '', '', '']); setQCorrect(q.correct_answer); setQDifficulty(q.difficulty); setShowAddForm(true); }}
                            className="p-1.5 rounded-lg text-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => deleteQuestion(q.id)}
                            className="p-1.5 rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
