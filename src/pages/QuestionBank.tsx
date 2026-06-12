import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, ChevronDown, ChevronUp, X, BookOpen } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';

const DIFFICULTY_COLORS: Record<string, string> = {
  سهل: 'bg-emerald-100 text-emerald-700',
  متوسط: 'bg-amber-100 text-amber-700',
  صعب: 'bg-red-100 text-red-700',
};
const TYPE_BADGES: Record<string, string> = {
  'اختيار من متعدد': '🔘',
  'صح/خطأ': '✅',
  مقالي: '📝',
};

export default function QuestionBank() {
  const { show, confirm } = useToast();
  const [questions, setQuestions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [qText, setQText] = useState('');
  const [qSubject, setQSubject] = useState('');
  const [qType, setQType] = useState('اختيار من متعدد');
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState('');
  const [qDifficulty, setQDifficulty] = useState('متوسط');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [qRes, sRes] = await Promise.all([
      supabase.from('questions').select('*').order('created_at', { ascending: false }),
      supabase.from('subjects').select('id, name').order('name'),
    ]);
    setQuestions(qRes.data || []);
    setSubjects(sRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || id;

  const filtered = questions.filter(q => {
    if (search && !q.question_text.includes(search)) return false;
    if (filterSubject && q.subject_id !== filterSubject) return false;
    if (filterType && q.question_type !== filterType) return false;
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
    return true;
  });

  const resetForm = () => {
    setEditId(null); setQText(''); setQSubject(''); setQType('اختيار من متعدد');
    setQOptions(['', '', '', '']); setQCorrect(''); setQDifficulty('متوسط');
    setShowForm(false);
  };

  const openEdit = (q: any) => {
    setEditId(q.id); setQText(q.question_text); setQSubject(q.subject_id || '');
    setQType(q.question_type || 'اختيار من متعدد');
    setQOptions(Array.isArray(q.options) && q.options.length ? q.options : ['', '', '', '']);
    setQCorrect(q.correct_answer || ''); setQDifficulty(q.difficulty || 'متوسط');
    setShowForm(true);
  };

  const save = async () => {
    if (!qText.trim()) return show('نص السؤال مطلوب', 'error');
    if ((qType === 'اختيار من متعدد' || qType === 'صح/خطأ') && !qCorrect.trim()) return show('الإجابة الصحيحة مطلوبة', 'error');
    setSaving(true);
    const payload: any = {
      subject_id: qSubject || null,
      question_text: qText.trim(),
      options: qType === 'صح/خطأ' ? ['صح', 'خطأ'] : qType === 'اختيار من متعدد' ? qOptions.filter(o => o.trim()) : [],
      correct_answer: qCorrect.trim(),
      question_type: qType,
      difficulty: qDifficulty,
    };
    try {
      if (editId) await supabase.from('questions').update(payload).eq('id', editId);
      else await supabase.from('questions').insert(payload);
      show(editId ? 'تم تعديل السؤال' : 'تم إضافة السؤال', 'success');
      resetForm();
      load();
    } catch { show('حدث خطأ', 'error'); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    const ok = await confirm('حذف هذا السؤال؟');
    if (!ok) return;
    await supabase.from('questions').delete().eq('id', id);
    show('تم حذف السؤال');
    load();
  };

  const getOptionLabel = (i: number) => String.fromCharCode(65 + i);

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <BookOpen size={20} className="text-violet-500" /> بنك الأسئلة
        </h2>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-violet-500 text-white rounded-lg text-sm font-semibold hover:bg-violet-600 transition-colors flex items-center gap-2">
          <Plus size={16} /> إضافة سؤال
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في نص السؤال..."
            className="w-full border border-gray-200 rounded-lg pr-10 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>
        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
          <option value="">كل المواد</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
          <option value="">كل الأنواع</option>
          <option value="اختيار من متعدد">🔘 اختيار من متعدد</option>
          <option value="صح/خطأ">✅ صح/خطأ</option>
          <option value="مقالي">📝 مقالي</option>
        </select>
        <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
          <option value="">كل المستويات</option>
          <option value="سهل">سهل</option>
          <option value="متوسط">متوسط</option>
          <option value="صعب">صعب</option>
        </select>
        <span className="text-xs text-gray-400">{filtered.length} سؤال</span>
      </div>

      {/* Question list */}
      {loading && <div className="text-center text-gray-400 py-20">جاري التحميل...</div>}

      {!loading && (
        <div className="space-y-2">
          {filtered.map(q => {
            const isExpanded = expandedId === q.id;
            return (
              <div key={q.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpandedId(isExpanded ? null : q.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs">{TYPE_BADGES[q.question_type] || '📄'}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[q.difficulty] || ''}`}>{q.difficulty}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{getSubjectName(q.subject_id)}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 line-clamp-1">{q.question_text}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={e => { e.stopPropagation(); openEdit(q); }}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); remove(q.id); }}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-4 pt-0 border-t border-gray-100">
                    <div className="mt-3 space-y-2 text-sm">
                      {q.question_type === 'اختيار من متعدد' && Array.isArray(q.options) && q.options.map((opt: string, i: number) => (
                        <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${opt === q.correct_answer ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-600'}`}>
                          <span className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-xs font-bold">{getOptionLabel(i)}</span>
                          {opt}
                          {opt === q.correct_answer && <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 rounded">✓</span>}
                        </div>
                      ))}
                      {q.question_type === 'صح/خطأ' && (
                        <div className="flex gap-4">
                          <span className={`px-3 py-1.5 rounded-lg ${q.correct_answer === 'صح' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-600'}`}>✅ صح</span>
                          <span className={`px-3 py-1.5 rounded-lg ${q.correct_answer === 'خطأ' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-600'}`}>❌ خطأ</span>
                        </div>
                      )}
                      {q.question_type === 'مقالي' && <p className="text-gray-500 italic">(إجابة مفتوحة)</p>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!filtered.length && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-300 text-sm">
              {search || filterSubject || filterType || filterDifficulty ? 'لا توجد نتائج للبحث' : 'لا توجد أسئلة بعد'}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { if (!saving) resetForm(); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-bold text-gray-800">{editId ? 'تعديل سؤال' : 'إضافة سؤال'}</h3>
              <button onClick={resetForm} disabled={saving}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">المادة</label>
                <select value={qSubject} onChange={e => setQSubject(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                  <option value="">اختر المادة</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">نوع السؤال</label>
                <select value={qType} onChange={e => { setQType(e.target.value); setQCorrect(''); setQOptions(e.target.value === 'صح/خطأ' ? ['صح', 'خطأ'] : ['', '', '', '']); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                  <option value="اختيار من متعدد">🔘 اختيار من متعدد</option>
                  <option value="صح/خطأ">✅ صح/خطأ</option>
                  <option value="مقالي">📝 مقالي</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">المستوى</label>
                <select value={qDifficulty} onChange={e => setQDifficulty(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                  <option value="سهل">سهل</option>
                  <option value="متوسط">متوسط</option>
                  <option value="صعب">صعب</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">نص السؤال</label>
                <textarea value={qText} onChange={e => setQText(e.target.value)} rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
              </div>
              {qType === 'اختيار من متعدد' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">الخيارات</label>
                  <div className="space-y-2">
                    {qOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-xs font-bold shrink-0">{getOptionLabel(i)}</span>
                        <input value={opt} onChange={e => { const n = [...qOptions]; n[i] = e.target.value; setQOptions(n); }}
                          placeholder={`الخيار ${getOptionLabel(i)}`}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(qType === 'اختيار من متعدد' || qType === 'صح/خطأ') && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">الإجابة الصحيحة</label>
                  {qType === 'صح/خطأ' ? (
                    <div className="flex gap-3">
                      <button onClick={() => setQCorrect('صح')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${qCorrect === 'صح' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>✅ صح</button>
                      <button onClick={() => setQCorrect('خطأ')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${qCorrect === 'خطأ' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>❌ خطأ</button>
                    </div>
                  ) : (
                    <select value={qCorrect} onChange={e => setQCorrect(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                      <option value="">اختر الإجابة الصحيحة</option>
                      {qOptions.filter(o => o.trim()).map((opt, i) => (
                        <option key={i} value={opt}>{getOptionLabel(i)}. {opt}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={resetForm} disabled={saving}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">إلغاء</button>
                <button onClick={save} disabled={saving}
                  className="px-6 py-2 bg-violet-500 text-white rounded-lg text-sm font-semibold hover:bg-violet-600 transition-colors disabled:opacity-50">
                  {saving ? 'جاري الحفظ...' : editId ? 'حفظ التعديلات' : 'إضافة السؤال'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
